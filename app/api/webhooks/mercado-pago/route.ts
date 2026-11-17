import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { getMercadoPagoCredentialsForServer } from '@/lib/repositories/payment-settings'
import {
  applyMercadoPagoAuthorizedPayment,
  applyMercadoPagoChargeback,
  getMercadoPagoCheckoutByExternalReference,
  saveMercadoPagoOneTimePayment,
  saveMercadoPagoPreapproval,
} from '@/lib/repositories/mercadopago-subscriptions'

export const runtime = 'nodejs'

async function cancelPreapproval(preapprovalId: string, accessToken: string) {
  const response = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(preapprovalId)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ status: 'cancelled' }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) return false
  const result = await response.json() as { status?: string }
  return !result.status || result.status === 'cancelled'
}

function isValidSignature(signatureHeader: string | null, requestId: string | null, dataId: string, secret: string) {
  if (!signatureHeader || !requestId) return false
  const fields = Object.fromEntries(signatureHeader.split(',').map((part) => {
    const [key, ...rest] = part.trim().split('=')
    return [key, rest.join('=')]
  }))
  const timestamp = fields.ts
  const providedSignature = fields.v1
  if (!timestamp || !providedSignature || !/^[a-f0-9]+$/i.test(providedSignature)) return false

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${timestamp};`
  const expectedSignature = createHmac('sha256', secret).update(manifest).digest()
  const supplied = Buffer.from(providedSignature, 'hex')
  return supplied.length === expectedSignature.length && timingSafeEqual(supplied, expectedSignature)
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null) as {
    type?: unknown
    action?: unknown
    data?: { id?: unknown; payment_id?: unknown }
  } | null
  if (!payload) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })

  const eventType = String(request.nextUrl.searchParams.get('type') ?? request.nextUrl.searchParams.get('topic') ?? payload.type ?? payload.action ?? '')
  if (!['subscription_preapproval', 'subscription_authorized_payment', 'payment', 'topic_chargebacks_wh', 'chargebacks'].includes(eventType)) {
    return NextResponse.json({ received: true, ignored: true })
  }

  const dataId = String(request.nextUrl.searchParams.get('data.id') ?? payload.data?.id ?? '').toLowerCase()
  const credentials = await getMercadoPagoCredentialsForServer()
  if (!credentials?.accessToken || !credentials.webhookSecret) {
    return NextResponse.json({ error: 'Webhook Mercado Pago não configurado.' }, { status: 503 })
  }
  if (!dataId || !isValidSignature(request.headers.get('x-signature'), request.headers.get('x-request-id'), dataId, credentials.webhookSecret)) {
    return NextResponse.json({ error: 'Assinatura do webhook inválida.' }, { status: 401 })
  }

  const isChargebackEvent = eventType === 'topic_chargebacks_wh' || eventType === 'chargebacks'
  const resourcePath = isChargebackEvent
    ? `/v1/chargebacks/${encodeURIComponent(dataId)}`
    : eventType === 'subscription_preapproval'
      ? `/preapproval/${encodeURIComponent(dataId)}`
      : eventType === 'subscription_authorized_payment'
        ? `/authorized_payments/${encodeURIComponent(dataId)}`
        : `/v1/payments/${encodeURIComponent(dataId)}`

  try {
    const response = await fetch(`https://api.mercadopago.com${resourcePath}`, {
      headers: { Authorization: `Bearer ${credentials.accessToken}`, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) return NextResponse.json({ error: 'Não foi possível confirmar o evento no Mercado Pago.' }, { status: 503 })

    const resource = await response.json() as {
      id?: string | number
      status?: string
      external_reference?: string
      preapproval_id?: string | number
      payment_id?: string | number
      next_payment_date?: string
      date_approved?: string
      payment_method_id?: string
      point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string; expiration_date?: string } }
    }

    if (isChargebackEvent) {
      const paymentId = String(resource.payment_id ?? payload.data?.payment_id ?? '')
      if (!paymentId) return NextResponse.json({ received: true, ignored: true })

      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
        headers: { Authorization: `Bearer ${credentials.accessToken}`, Accept: 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      })
      if (!paymentResponse.ok) return NextResponse.json({ error: 'Não foi possível confirmar o pagamento contestado.' }, { status: 503 })
      const payment = await paymentResponse.json() as {
        external_reference?: string
        preapproval_id?: string | number
        metadata?: { preapproval_id?: string | number }
      }
      await applyMercadoPagoChargeback({
        paymentId,
        externalReference: payment.external_reference,
        preapprovalId: payment.preapproval_id !== undefined
          ? String(payment.preapproval_id)
          : payment.metadata?.preapproval_id !== undefined ? String(payment.metadata.preapproval_id) : null,
      })
    } else if (eventType === 'subscription_preapproval') {
      const externalReference = resource.external_reference
      const checkout = externalReference ? await getMercadoPagoCheckoutByExternalReference(externalReference) : null
      if (!externalReference || !checkout?.amount || !checkout.billingPeriod || resource.id === undefined || !resource.status) {
        return NextResponse.json({ received: true, ignored: true })
      }
      const nextPaymentDate = resource.next_payment_date ? new Date(resource.next_payment_date) : null
      await saveMercadoPagoPreapproval({
        preapprovalId: String(resource.id),
        externalReference,
        status: resource.status,
        amount: checkout.amount,
        billingPeriod: checkout.billingPeriod,
        currentPeriodEndsAt: nextPaymentDate && !Number.isNaN(nextPaymentDate.getTime()) ? nextPaymentDate : null,
        nextPaymentAt: nextPaymentDate && !Number.isNaN(nextPaymentDate.getTime()) ? nextPaymentDate : null,
      })
    } else if (eventType === 'subscription_authorized_payment' && resource.preapproval_id !== undefined && resource.status) {
      const preapprovalResponse = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(String(resource.preapproval_id))}`, {
        headers: { Authorization: `Bearer ${credentials.accessToken}`, Accept: 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      })
      if (!preapprovalResponse.ok) return NextResponse.json({ error: 'Não foi possível atualizar a próxima renovação.' }, { status: 503 })
      const preapproval = await preapprovalResponse.json() as { next_payment_date?: string }
      const nextPaymentDate = preapproval.next_payment_date ? new Date(preapproval.next_payment_date) : null
      await applyMercadoPagoAuthorizedPayment({
        preapprovalId: String(resource.preapproval_id),
        status: resource.status,
        nextPaymentAt: nextPaymentDate && !Number.isNaN(nextPaymentDate.getTime()) ? nextPaymentDate : null,
      })
    } else if (eventType === 'payment' && resource.external_reference && resource.id !== undefined && resource.status) {
      const checkout = await getMercadoPagoCheckoutByExternalReference(resource.external_reference)
      if (!checkout || checkout.checkoutMode !== 'one_time' || !checkout.amount || !checkout.billingPeriod || !checkout.paymentMethod) {
        return NextResponse.json({ received: true, ignored: true })
      }
      const pixExpiresAt = resource.point_of_interaction?.transaction_data?.expiration_date
        ? new Date(resource.point_of_interaction.transaction_data.expiration_date)
        : null
      await saveMercadoPagoOneTimePayment({
        paymentId: String(resource.id),
        externalReference: resource.external_reference,
        status: resource.status,
        paymentMethod: checkout.paymentMethod,
        amount: checkout.amount,
        billingPeriod: checkout.billingPeriod,
        pixQrCode: resource.point_of_interaction?.transaction_data?.qr_code,
        pixQrCodeBase64: resource.point_of_interaction?.transaction_data?.qr_code_base64,
        pixExpiresAt: pixExpiresAt && !Number.isNaN(pixExpiresAt.getTime()) ? pixExpiresAt : null,
        approvedAt: resource.date_approved ? new Date(resource.date_approved) : null,
      })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[mercadopago-webhook] Falha ao confirmar notificação', error instanceof Error ? error.message : 'erro desconhecido')
    return NextResponse.json({ error: 'Falha temporária ao processar o webhook.' }, { status: 503 })
  }
}
