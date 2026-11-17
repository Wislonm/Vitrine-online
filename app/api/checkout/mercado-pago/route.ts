import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { user as userTable } from '@/lib/db/schema'
import { LEGAL_DOCUMENT_VERSION } from '@/lib/legal'
import { getMercadoPagoCredentialsForServer } from '@/lib/repositories/payment-settings'
import { getMercadoPagoSubscriptionState, claimMercadoPagoCheckout, releaseMercadoPagoCheckout, saveMercadoPagoPreapproval } from '@/lib/repositories/mercadopago-subscriptions'
import { listPlans } from '@/lib/repositories/plans'
import { getSellerContextOrThrow, UnauthorizedError } from '@/lib/session'
import { getBaseUrl } from '@/lib/url'

export const runtime = 'nodejs'

const checkoutSchema = z.object({
  cardToken: z.string().trim().min(1).max(2048),
  legalTermsAccepted: z.literal(true),
  recurringAccepted: z.literal(true),
})

const periodFrequency = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  yearly: 12,
} as const

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin')
    const baseUrl = await getBaseUrl()
    if (!origin || origin !== new URL(baseUrl).origin) {
      return NextResponse.json({ error: 'Origem da requisição inválida.' }, { status: 403 })
    }

    const context = await getSellerContextOrThrow({ allowExpiredPlan: true })
    const currentState = await getMercadoPagoSubscriptionState(context.store.id)
    const trialActive = Boolean(currentState?.status === 'trial' && currentState.expiresAt && currentState.expiresAt.getTime() > Date.now())
    if (!context.subscriptionExpired && !trialActive) {
      return NextResponse.json({ error: 'Sua assinatura atual já está ativa.' }, { status: 409 })
    }

    const parsed = checkoutSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Revise os dados e aceite os termos e a cobrança recorrente.' }, { status: 400 })

    await db.update(userTable).set({ termsAccepted: true, termsAcceptedAt: new Date(), termsVersion: LEGAL_DOCUMENT_VERSION, updatedAt: new Date() }).where(eq(userTable.id, context.user.id))

    const activePlans = await listPlans({ onlyActive: true })
    const plan = activePlans.find((activePlan) => activePlan.slug === 'business') ?? null
    if (!plan || Number(plan.price) <= 0) {
      return NextResponse.json({ error: 'O plano ainda não tem um valor de cobrança configurado.' }, { status: 409 })
    }

    const credentials = await getMercadoPagoCredentialsForServer()
    if (!credentials?.publicKey || !credentials.accessToken || !credentials.webhookSecret) {
      return NextResponse.json({ error: 'A configuração do Mercado Pago está incompleta. Fale com o suporte.' }, { status: 503 })
    }
    if (credentials.environment === 'test' && process.env.VERCEL_ENV === 'production') {
      return NextResponse.json({ error: 'O checkout está em ambiente de teste e não pode ativar assinaturas em produção.' }, { status: 503 })
    }
    if (credentials.environment === 'production' && process.env.VERCEL_ENV !== 'production') {
      return NextResponse.json({ error: 'Credenciais de produção só podem ser usadas no ambiente de produção.' }, { status: 503 })
    }

    if (currentState?.preapprovalId && currentState.providerStatus === 'pending') {
      return NextResponse.json({ error: 'Já existe uma assinatura em processamento. Aguarde a confirmação antes de tentar novamente.', state: 'processing' }, { status: 409 })
    }
    if (currentState?.preapprovalId && currentState.providerStatus === 'authorized') {
      return NextResponse.json({ error: 'Já existe uma autorização Mercado Pago para esta loja. Cancele a renovação atual antes de criar outra.', status: 'active' }, { status: 409 })
    }
    if (currentState?.paymentId && currentState.providerStatus === 'pending') {
      return NextResponse.json({ error: 'Já existe um pagamento único em processamento. Aguarde a confirmação antes de iniciar uma assinatura recorrente.', state: 'processing' }, { status: 409 })
    }
    if (currentState?.checkoutStartedAt) {
      return NextResponse.json({ error: 'Uma solicitação de pagamento está sendo confirmada. Atualize a página em instantes.', state: 'processing' }, { status: 409 })
    }

    const externalReference = randomUUID()
    const claimed = await claimMercadoPagoCheckout({
      storeId: context.store.id,
      externalReference,
      amount: Number(plan.price).toFixed(2),
      billingPeriod: plan.billingPeriod,
      checkoutMode: 'recurring',
      paymentMethod: 'card',
      consentVersion: LEGAL_DOCUMENT_VERSION,
    })
    if (!claimed) {
      return NextResponse.json({ error: 'O checkout já está sendo iniciado. Aguarde alguns segundos e atualize a página.', state: 'processing' }, { status: 409 })
    }

    const payload = {
      reason: plan.name,
      external_reference: externalReference,
      payer_email: context.user.email,
      card_token_id: parsed.data.cardToken,
      status: 'authorized',
      auto_recurring: {
        frequency: periodFrequency[plan.billingPeriod],
        frequency_type: 'months',
        transaction_amount: Number(plan.price),
        currency_id: 'BRL',
        ...(trialActive && currentState?.expiresAt ? { start_date: currentState.expiresAt.toISOString() } : {}),
      },
      back_url: `${baseUrl}/painel/plano?assinatura=retorno`,
    }

    let response: Response
    try {
      response = await fetch('https://api.mercadopago.com/preapproval', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
        signal: AbortSignal.timeout(20_000),
      })
    } catch {
      return NextResponse.json({ state: 'processing', message: 'Estamos aguardando a confirmação do Mercado Pago. Não envie o formulário novamente.' }, { status: 202 })
    }

    if (!response.ok) {
      await releaseMercadoPagoCheckout(context.store.id, externalReference)
      const status = response.status === 400 || response.status === 402 ? 422 : response.status === 429 ? 429 : 502
      const error = response.status === 401 || response.status === 403
        ? 'As credenciais do Mercado Pago foram recusadas. Fale com o suporte.'
        : response.status === 400 || response.status === 402
          ? 'O Mercado Pago não autorizou este cartão. Confira os dados ou tente outro cartão.'
          : response.status === 429
            ? 'Muitas tentativas. Aguarde alguns instantes antes de tentar novamente.'
            : 'Não foi possível concluir a solicitação agora.'
      return NextResponse.json({ error }, { status })
    }

    const result = await response.json() as { id?: string | number; status?: string; next_payment_date?: string }
    if (result.id === undefined || result.id === null || !result.status) {
      return NextResponse.json({ state: 'processing', message: 'O Mercado Pago recebeu a solicitação. Aguardando confirmação.' }, { status: 202 })
    }

    const preapprovalStatus = result.status.toLowerCase()
    const responseNextPaymentDate = result.next_payment_date ? new Date(result.next_payment_date) : null
    const nextPaymentAt = responseNextPaymentDate && !Number.isNaN(responseNextPaymentDate.getTime())
      ? responseNextPaymentDate
      : trialActive ? currentState?.expiresAt ?? null : null
    if (!['authorized', 'pending'].includes(preapprovalStatus)) {
      await saveMercadoPagoPreapproval({
        preapprovalId: String(result.id),
        externalReference,
        status: preapprovalStatus,
        amount: Number(plan.price).toFixed(2),
        billingPeriod: plan.billingPeriod,
        nextPaymentAt,
      })
      return NextResponse.json({ error: 'A assinatura não foi autorizada. Confira o cartão e tente novamente.' }, { status: 422 })
    }

    const saved = await saveMercadoPagoPreapproval({
      preapprovalId: String(result.id),
      externalReference,
      status: preapprovalStatus,
      amount: Number(plan.price).toFixed(2),
      billingPeriod: plan.billingPeriod,
      nextPaymentAt,
    })
    if (!saved) return NextResponse.json({ state: 'processing', message: 'Assinatura criada e aguardando sincronização.' }, { status: 202 })

    return NextResponse.json({
      state: preapprovalStatus === 'authorized' ? 'active' : 'processing',
      message: preapprovalStatus === 'authorized' ? 'Assinatura autorizada com sucesso.' : 'Assinatura enviada. Aguardando confirmação do Mercado Pago.',
    }, { status: preapprovalStatus === 'authorized' ? 200 : 202 })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Faça login para contratar o plano.' }, { status: 401 })
    }
    console.error('[checkout] Mercado Pago request failed')
    return NextResponse.json({ error: 'Não foi possível iniciar o checkout agora.' }, { status: 500 })
  }
}
