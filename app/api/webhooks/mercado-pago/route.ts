import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { getMercadoPagoCredentialsForServer } from '@/lib/repositories/payment-settings'
import {
  applyMercadoPagoAuthorizedPayment,
  getMercadoPagoCheckoutByExternalReference,
  saveMercadoPagoPreapproval,
} from '@/lib/repositories/mercadopago-subscriptions'

export const runtime = 'nodejs'

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
    data?: { id?: unknown }
  } | null
  if (!payload) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })

  const eventType = String(request.nextUrl.searchParams.get('type') ?? payload.type ?? payload.action ?? '')
  if (!['subscription_preapproval', 'subscription_authorized_payment'].includes(eventType)) {
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

  const resourcePath = eventType === 'subscription_preapproval'
    ? `/preapproval/${encodeURIComponent(dataId)}`
    : `/authorized_payments/${encodeURIComponent(dataId)}`

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
      next_payment_date?: string
    }

    if (eventType === 'subscription_preapproval') {
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
      })
    } else if (resource.preapproval_id !== undefined && resource.status) {
      await applyMercadoPagoAuthorizedPayment({
        preapprovalId: String(resource.preapproval_id),
        status: resource.status,
      })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[mercadopago-webhook] Falha ao confirmar notificação', error instanceof Error ? error.message : 'erro desconhecido')
    return NextResponse.json({ error: 'Falha temporária ao processar o webhook.' }, { status: 503 })
  }
}
