import { NextResponse } from 'next/server'
import { getMercadoPagoSubscriptionState } from '@/lib/repositories/mercadopago-subscriptions'
import { getSellerContextOrThrow, UnauthorizedError } from '@/lib/session'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const { store, subscriptionExpired } = await getSellerContextOrThrow({ allowExpiredPlan: true })
    const subscription = await getMercadoPagoSubscriptionState(store.id)
    const paymentExpired = Boolean(
      subscription?.paymentMethod === 'pix' &&
      ['pending', 'in_process'].includes(subscription.providerStatus ?? '') &&
      subscription.pixExpiresAt &&
      subscription.pixExpiresAt.getTime() <= Date.now(),
    )
    return NextResponse.json({
      active: !subscriptionExpired && ['authorized', 'approved'].includes(subscription?.providerStatus ?? ''),
      processing: !paymentExpired && (Boolean(subscription?.checkoutStartedAt) || ['pending', 'in_process', 'processing'].includes(subscription?.providerStatus ?? '')),
      paymentExpired,
      status: subscription?.status ?? null,
      providerStatus: subscription?.providerStatus ?? null,
      checkoutMode: subscription?.checkoutMode ?? null,
      paymentMethod: subscription?.paymentMethod ?? null,
      pixQrCode: subscription?.pixQrCode ?? null,
      pixQrCodeBase64: subscription?.pixQrCodeBase64 ?? null,
      pixExpiresAt: subscription?.pixExpiresAt?.toISOString() ?? null,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: 'Faça login novamente.' }, { status: 401 })
    console.error('[mercadopago-checkout-status] Falha ao consultar status', error)
    return NextResponse.json({ error: 'Não foi possível consultar o status da assinatura.' }, { status: 500 })
  }
}
