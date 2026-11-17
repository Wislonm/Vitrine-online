import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { plans, subscriptions } from '@/lib/db/schema'

export type Plan = typeof plans.$inferSelect
export type CheckoutBillingPeriod = 'monthly' | 'semiannual' | 'yearly'

export function getPlanPrice(plan: Plan, period: CheckoutBillingPeriod) {
  const value = period === 'monthly'
    ? plan.monthlyPrice ?? plan.price
    : period === 'semiannual'
      ? plan.semiannualPrice
      : plan.annualPrice
  return value === null ? null : Number(value)
}

export function getPlanPeriodPrices(plan: Plan) {
  return (['monthly', 'semiannual', 'yearly'] as const).flatMap((period) => {
    const amount = getPlanPrice(plan, period)
    return amount !== null && amount > 0 ? [{ period, amount }] : []
  })
}

export async function listPlans(options: { onlyActive?: boolean } = {}) {
  const rows = await db.select().from(plans).orderBy(plans.productLimit)
  return options.onlyActive ? rows.filter((p) => p.isActive && p.slug !== 'trial-default') : rows
}

export async function getPlanForStore(storeId: string) {
  const [row] = await db
    .select({ plan: plans, subscription: subscriptions })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(eq(subscriptions.storeId, storeId))
    .limit(1)
  return row ?? null
}

export async function updatePlan(
  planId: string,
  data: Pick<Plan, 'name' | 'description' | 'productLimit' | 'trialDays' | 'price' | 'monthlyPrice' | 'semiannualPrice' | 'annualPrice' | 'billingPeriod' | 'isActive'>,
) {
  await db
    .update(plans)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(plans.id, planId))
}

export async function setStorePlan(storeId: string, planId: string) {
  await db
    .update(subscriptions)
    .set({ planId, status: 'active', startedAt: new Date(), expiresAt: null, updatedAt: new Date() })
    .where(eq(subscriptions.storeId, storeId))
}
