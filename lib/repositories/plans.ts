import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { plans, subscriptions } from '@/lib/db/schema'

export type Plan = typeof plans.$inferSelect

export async function listPlans(options: { onlyActive?: boolean } = {}) {
  const rows = await db.select().from(plans).orderBy(plans.productLimit)
  return options.onlyActive ? rows.filter((p) => p.isActive) : rows
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
  data: Pick<Plan, 'name' | 'description' | 'productLimit' | 'price' | 'billingPeriod' | 'isActive'>,
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
