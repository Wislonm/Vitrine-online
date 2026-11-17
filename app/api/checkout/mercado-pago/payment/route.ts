import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { user as userTable } from '@/lib/db/schema'
import { LEGAL_DOCUMENT_VERSION } from '@/lib/legal'
import { getMercadoPagoCredentialsForServer } from '@/lib/repositories/payment-settings'
import { claimMercadoPagoCheckout, getMercadoPagoSubscriptionState, releaseMercadoPagoCheckout, saveMercadoPagoOneTimePayment } from '@/lib/repositories/mercadopago-subscriptions'
import { getPlanForStore } from '@/lib/repositories/plans'
import { getSellerContextOrThrow, UnauthorizedError } from '@/lib/session'
import { getBaseUrl } from '@/lib/url'

export const runtime = 'nodejs'

const pixPaymentSchema = z.object({
  paymentMethod: z.literal('pix'),
  legalTermsAccepted: z.literal(true),
})

const cardPaymentSchema = z.object({
  paymentMethod: z.literal('card'),
  legalTermsAccepted: z.literal(true),
  cardToken: z.string().trim().min(1).max(2048),
  paymentMethodId: z.string().trim().min(1).max(80),
  payerEmail: z.email().max(120),
  issuerId: z.string().trim().max(80).optional(),
  installments: z.coerce.number().int().min(1).max(36),
  identificationType: z.enum(['CPF', 'CNPJ']),
  identificationNumber: z.string().regex(/^\d{11}$|^\d{14}$/),
})

const paymentSchema = z.discriminatedUnion('paymentMethod', [pixPaymentSchema, cardPaymentSchema])

function addBillingPeriod(start: Date, period: 'monthly' | 'quarterly' | 'semiannual' | 'yearly') {
  const months = { monthly: 1, quarterly: 3, semiannual: 6, yearly: 12 }[period]
  const result = new Date(start)
  const day = result.getUTCDate()
  result.setUTCDate(1)
  result.setUTCMonth(result.getUTCMonth() + months)
  result.setUTCDate(Math.min(day, new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()))
  return result
}

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin')
    const baseUrl = await getBaseUrl()
    if (!origin || origin !== new URL(baseUrl).origin) {
      return NextResponse.json({ error: 'Origem da requisição inválida.' }, { status: 403 })
    }

    const context = await getSellerContextOrThrow({ allowExpiredPlan: true })
    if (!context.subscriptionExpired) {
      return NextResponse.json({ error: 'O pagamento ficará disponível quando o teste grátis terminar.' }, { status: 409 })
    }

    const parsed = paymentSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Revise os dados do pagamento e aceite os termos.' }, { status: 400 })

    await db.update(userTable).set({ termsAccepted: true, termsAcceptedAt: new Date(), termsVersion: LEGAL_DOCUMENT_VERSION, updatedAt: new Date() }).where(eq(userTable.id, context.user.id))

    const planRow = await getPlanForStore(context.store.id)
    const plan = planRow?.plan
    if (!plan || !plan.isActive || Number(plan.price) <= 0) {
      return NextResponse.json({ error: 'O plano ainda não tem um valor de cobrança configurado.' }, { status: 409 })
    }

    const credentials = await getMercadoPagoCredentialsForServer()
    if (!credentials?.publicKey || !credentials.accessToken || !credentials.webhookSecret) {
      return NextResponse.json({ error: 'A configuração do Mercado Pago está incompleta. Fale com o suporte.' }, { status: 503 })
    }
    if (credentials.environment === 'test' && process.env.VERCEL_ENV === 'production') {
      return NextResponse.json({ error: 'O ambiente de teste não pode receber pagamentos em produção.' }, { status: 503 })
    }

    const currentState = await getMercadoPagoSubscriptionState(context.store.id)
    if (currentState?.preapprovalId && ['pending', 'authorized'].includes(currentState.providerStatus ?? '')) {
      return NextResponse.json({ error: 'Já existe uma assinatura recorrente em processamento. Cancele-a antes de iniciar outro pagamento.', state: 'processing' }, { status: 409 })
    }
    if (currentState?.paymentId && ['pending', 'in_process'].includes(currentState.providerStatus ?? '')) {
      const pixStillValid = currentState.paymentMethod === 'pix' && (!currentState.pixExpiresAt || currentState.pixExpiresAt.getTime() > Date.now())
      if (currentState.paymentMethod === 'card' || pixStillValid) {
        return NextResponse.json({ error: 'Já existe um pagamento em processamento. Aguarde a confirmação antes de tentar novamente.', state: 'processing' }, { status: 409 })
      }
      if (currentState.paymentMethod === 'pix') {
        try {
          const oldPaymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(currentState.paymentId)}`, {
            headers: { Authorization: `Bearer ${credentials.accessToken}`, Accept: 'application/json' },
            cache: 'no-store',
            signal: AbortSignal.timeout(8_000),
          })
          if (!oldPaymentResponse.ok && oldPaymentResponse.status !== 404) {
            return NextResponse.json({ error: 'Não foi possível verificar o Pix anterior. Tente novamente antes de gerar outro código.' }, { status: 409 })
          }
          if (oldPaymentResponse.ok) {
            const oldPayment = await oldPaymentResponse.json() as { status?: string; date_approved?: string }
            if (oldPayment.status === 'approved') {
              await saveMercadoPagoOneTimePayment({
                paymentId: currentState.paymentId,
                externalReference: currentState.externalReference ?? '',
                status: 'approved',
                paymentMethod: 'pix',
                amount: currentState.amount ?? Number(plan.price).toFixed(2),
                billingPeriod: currentState.billingPeriod ?? plan.billingPeriod,
                approvedAt: oldPayment.date_approved ? new Date(oldPayment.date_approved) : null,
              })
              return NextResponse.json({ state: 'active', message: 'Pagamento Pix confirmado. Sua assinatura está ativa.' })
            }
          }
        } catch {
          return NextResponse.json({ error: 'Não foi possível verificar o Pix anterior. Aguarde e atualize a página antes de tentar novamente.', state: 'processing' }, { status: 409 })
        }
      }
    }
    if (currentState?.checkoutStartedAt) {
      return NextResponse.json({ error: 'Um pagamento está sendo confirmado. Aguarde antes de iniciar outro checkout.', state: 'processing' }, { status: 409 })
    }

    const externalReference = randomUUID()
    const amount = Number(plan.price).toFixed(2)
    const claimed = await claimMercadoPagoCheckout({
      storeId: context.store.id,
      externalReference,
      amount,
      billingPeriod: plan.billingPeriod,
      checkoutMode: 'one_time',
      paymentMethod: parsed.data.paymentMethod,
      consentVersion: LEGAL_DOCUMENT_VERSION,
    })
    if (!claimed) return NextResponse.json({ error: 'Outro checkout está sendo iniciado. Aguarde e atualize a página.', state: 'processing' }, { status: 409 })

    const payerIdentification = parsed.data.paymentMethod === 'pix'
      ? context.user.documentType && context.user.documentNumber
        ? { type: context.user.documentType.toUpperCase(), number: context.user.documentNumber }
        : null
      : { type: parsed.data.identificationType, number: parsed.data.identificationNumber }
    if (!payerIdentification) {
      await releaseMercadoPagoCheckout(context.store.id, externalReference)
      return NextResponse.json({ error: 'Complete o CPF/CNPJ do titular no perfil antes de pagar por Pix.' }, { status: 400 })
    }

    const paymentPayload: Record<string, unknown> = {
      transaction_amount: Number(plan.price),
      description: `${plan.name} - ${plan.billingPeriod}`,
      payment_method_id: parsed.data.paymentMethod === 'pix' ? 'pix' : parsed.data.paymentMethodId,
      external_reference: externalReference,
      notification_url: `${baseUrl}/api/webhooks/mercado-pago?type=payment`,
      payer: {
        email: parsed.data.paymentMethod === 'card' ? parsed.data.payerEmail : context.user.email,
        identification: payerIdentification,
      },
    }
    if (parsed.data.paymentMethod === 'card') {
      paymentPayload.token = parsed.data.cardToken
      paymentPayload.installments = parsed.data.installments
      if (parsed.data.issuerId) paymentPayload.issuer_id = parsed.data.issuerId
    }

    let response: Response
    try {
      response = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Idempotency-Key': externalReference,
        },
        body: JSON.stringify(paymentPayload),
        cache: 'no-store',
        signal: AbortSignal.timeout(20_000),
      })
    } catch {
      return NextResponse.json({ state: 'processing', message: 'Estamos verificando o pagamento. Não envie outro pedido enquanto confirmamos o status.' }, { status: 202 })
    }

    if (!response.ok) {
      await releaseMercadoPagoCheckout(context.store.id, externalReference)
      const error = response.status === 401 || response.status === 403
        ? 'As credenciais do Mercado Pago foram recusadas. Fale com o suporte.'
        : response.status === 429
          ? 'Muitas tentativas. Aguarde e tente novamente.'
          : 'O Mercado Pago não aprovou os dados do pagamento. Confira e tente novamente.'
      return NextResponse.json({ error }, { status: response.status === 429 ? 429 : 422 })
    }

    const result = await response.json() as {
      id?: string | number
      status?: string
      date_approved?: string
      point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string; expiration_date?: string } }
    }
    if (result.id === undefined || !result.status) {
      return NextResponse.json({ state: 'processing', message: 'O Mercado Pago recebeu o pagamento. Aguardando confirmação.' }, { status: 202 })
    }

    const transaction = result.point_of_interaction?.transaction_data
    const pixExpiresAt = transaction?.expiration_date ? new Date(transaction.expiration_date) : null
    await saveMercadoPagoOneTimePayment({
      paymentId: String(result.id),
      externalReference,
      status: result.status,
      paymentMethod: parsed.data.paymentMethod,
      amount,
      billingPeriod: plan.billingPeriod,
      pixQrCode: transaction?.qr_code ?? null,
      pixQrCodeBase64: transaction?.qr_code_base64 ?? null,
      pixExpiresAt: pixExpiresAt && !Number.isNaN(pixExpiresAt.getTime()) ? pixExpiresAt : null,
      approvedAt: result.date_approved ? new Date(result.date_approved) : null,
    })

    if (result.status.toLowerCase() === 'approved') {
      return NextResponse.json({ state: 'active', message: 'Pagamento aprovado. Seu acesso foi liberado.' })
    }
    if (result.status.toLowerCase() === 'pending' || result.status.toLowerCase() === 'in_process') {
      return NextResponse.json({
        state: 'processing',
        paymentMethod: parsed.data.paymentMethod,
        pixQrCode: transaction?.qr_code ?? null,
        pixQrCodeBase64: transaction?.qr_code_base64 ?? null,
        pixExpiresAt: pixExpiresAt?.toISOString() ?? null,
        message: parsed.data.paymentMethod === 'pix' ? 'Pix gerado. Pague o QR Code para liberar sua assinatura.' : 'Pagamento enviado. Aguardando confirmação do Mercado Pago.',
      }, { status: 202 })
    }
    return NextResponse.json({ error: 'O pagamento não foi aprovado. Confira os dados ou tente outro método.' }, { status: 422 })
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: 'Faça login para contratar o plano.' }, { status: 401 })
    console.error('[checkout] Mercado Pago one-time payment failed')
    return NextResponse.json({ error: 'Não foi possível iniciar o pagamento agora.' }, { status: 500 })
  }
}
