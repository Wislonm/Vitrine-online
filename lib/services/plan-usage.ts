import { getPlanForStore } from '@/lib/repositories/plans'
import { countProducts } from '@/lib/repositories/products'

const DAY_MS = 24 * 60 * 60 * 1000

export async function getPlanUsage(storeId: string) {
  const [planRow, used] = await Promise.all([getPlanForStore(storeId), countProducts(storeId)])
  const plan = planRow?.plan ?? null
  const subscription = planRow?.subscription ?? null
  const limit = plan?.productLimit ?? 0
  const expiresAt = subscription?.expiresAt ?? null
  const terminalStatuses = ['expired', 'past_due', 'pending', 'paused', 'cancelled', 'suspended']
  const subscriptionExpired = Boolean(
    subscription && ((expiresAt && expiresAt.getTime() <= Date.now()) || terminalStatuses.includes(subscription.status)),
  )
  const isTrial = subscription?.status === 'trial'
  const isPermanentFree = plan?.slug === 'trial-default' && subscription?.status === 'active' && expiresAt === null
  const daysRemaining = expiresAt
    ? Math.max(Math.ceil((expiresAt.getTime() - Date.now()) / DAY_MS), 0)
    : null
  const nextPaymentAt = subscription?.mercadoPagoNextPaymentAt ?? null
  const daysUntilRenewal = nextPaymentAt
    ? Math.max(Math.ceil((nextPaymentAt.getTime() - Date.now()) / DAY_MS), 0)
    : null

  return {
    plan,
    subscription,
    used,
    limit,
    remaining: Math.max(limit - used, 0),
    percent: limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 100,
    isFull: used >= limit,
    isTrial,
    isPermanentFree,
    daysRemaining,
    daysUntilRenewal,
    subscriptionExpired,
  }
}
