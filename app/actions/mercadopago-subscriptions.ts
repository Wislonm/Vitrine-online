'use server'

import { revalidatePath } from 'next/cache'
import { getMercadoPagoCredentialsForServer } from '@/lib/repositories/payment-settings'
import { getMercadoPagoSubscriptionState, markMercadoPagoSubscriptionCancelled } from '@/lib/repositories/mercadopago-subscriptions'
import { getSellerContextOrThrow } from '@/lib/session'
import type { ActionResult } from '@/lib/validators'

export async function cancelMercadoPagoSubscriptionAction(): Promise<ActionResult> {
  try {
    const { store } = await getSellerContextOrThrow({ allowExpiredPlan: true })
    const subscription = await getMercadoPagoSubscriptionState(store.id)
    if (!subscription?.preapprovalId || subscription.providerStatus !== 'authorized') {
      return { ok: false, error: 'Não há renovação ativa do Mercado Pago para cancelar.' }
    }

    const credentials = await getMercadoPagoCredentialsForServer()
    if (!credentials?.accessToken) return { ok: false, error: 'A configuração do Mercado Pago está indisponível.' }

    const response = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(subscription.preapprovalId)}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ status: 'cancelled' }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) return { ok: false, error: 'Não foi possível cancelar a renovação agora. Tente novamente.' }

    const result = await response.json() as { status?: string; next_payment_date?: string }
    if (result.status && result.status !== 'cancelled') {
      return { ok: false, error: 'O Mercado Pago ainda não confirmou o cancelamento.' }
    }

    const nextPaymentDate = result.next_payment_date ? new Date(result.next_payment_date) : null
    const accessUntil = nextPaymentDate && !Number.isNaN(nextPaymentDate.getTime()) ? nextPaymentDate : null
    await markMercadoPagoSubscriptionCancelled({ storeId: store.id, preapprovalId: subscription.preapprovalId, accessUntil })
    revalidatePath('/painel/plano')
    revalidatePath('/painel')
    return { ok: true, message: accessUntil && accessUntil.getTime() > Date.now()
      ? `Renovação cancelada. O acesso continua até ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(accessUntil)}.`
      : 'Renovação cancelada.' }
  } catch (error) {
    console.error('[subscription] Mercado Pago cancellation failed', error instanceof Error ? error.message : 'unknown error')
    return { ok: false, error: 'Não foi possível cancelar a renovação agora.' }
  }
}
