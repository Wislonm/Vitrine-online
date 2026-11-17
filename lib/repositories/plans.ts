import { and, eq } from 'drizzle-orm'
import { addBillingPeriod } from '@/lib/billing-period'
import { db } from '@/lib/db'
import { plans, stores, subscriptions } from '@/lib/db/schema'

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

export async function setStorePlan(storeId: string, planId: string, period: CheckoutBillingPeriod, amount: number) {
  const now = new Date()
  const expiresAt = addBillingPeriod(now, period)
  const price = amount.toFixed(2)
  await db.transaction(async (tx) => {
    await tx
      .insert(subscriptions)
      .values({
        storeId,
        planId,
        status: 'active',
        startedAt: now,
        expiresAt,
        mercadoPagoAmount: price,
        mercadoPagoBillingPeriod: period,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: subscriptions.storeId,
        set: {
          planId,
          status: 'active',
          startedAt: now,
          expiresAt,
          mercadoPagoAmount: price,
          mercadoPagoBillingPeriod: period,
          updatedAt: now,
        },
      })
    await tx
      .update(stores)
      .set({ status: 'active', updatedAt: now })
      .where(and(eq(stores.id, storeId), eq(stores.status, 'suspended')))
  })
}
