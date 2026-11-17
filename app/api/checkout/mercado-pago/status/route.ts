import { NextResponse } from 'next/server'
import { getMercadoPagoSubscriptionState } from '@/lib/repositories/mercadopago-subscriptions'
import { getSellerContextOrThrow, UnauthorizedError } from '@/lib/session'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const { store, subscriptionExpired } = await getSellerContextOrThrow({ allowExpiredPlan: true })
    const subscription = await getMercadoPagoSubscriptionState(store.id)
    return NextResponse.json({
      active: !subscriptionExpired,
      processing: Boolean(subscription?.checkoutStartedAt) || subscription?.providerStatus === 'pending',
      status: subscription?.status ?? null,
      providerStatus: subscription?.providerStatus ?? null,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: 'Faça login novamente.' }, { status: 401 })
    console.error('[mercadopago-checkout-status] Falha ao consultar status', error)
    return NextResponse.json({ error: 'Não foi possível consultar o status da assinatura.' }, { status: 500 })
  }
}
