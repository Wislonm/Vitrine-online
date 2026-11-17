import { desc, eq, ilike, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { adminAuditLog, plans, products, session, stores, subscriptions, user } from '@/lib/db/schema'

export async function getAdminStats() {
  const [usersRow] = await db.select({ total: sql<number>`count(*)::int` }).from(user)
  const [storesRow] = await db.select({ total: sql<number>`count(*)::int` }).from(stores)
  const [productsRow] = await db.select({ total: sql<number>`count(*)::int` }).from(products)
  const [blockedRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(user)
    .where(eq(user.status, 'blocked'))
  const perPlan = await db
    .select({ slug: plans.slug, total: sql<number>`count(${subscriptions.id})::int` })
    .from(plans)
    .leftJoin(subscriptions, eq(subscriptions.planId, plans.id))
    .groupBy(plans.slug)

  const count = (slug: string) => perPlan.find((p) => p.slug === slug)?.total ?? 0
  return {
    users: usersRow?.total ?? 0,
    stores: storesRow?.total ?? 0,
    products: productsRow?.total ?? 0,
    blocked: blockedRow?.total ?? 0,
    free: count('free'),
    business: count('business'),
  }
}

export async function listAccounts(search?: string) {
  const term = search?.trim().replace(/[%_]/g, '')
  const productCount = sql<number>`(select count(*)::int from ${products} where ${products.storeId} = ${stores.id})`

  const accounts = await db
    .select({
      userId: user.id,
      userName: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      storeStatus: stores.status,
      subscriptionStatus: subscriptions.status,
      subscriptionExpiresAt: subscriptions.expiresAt,
      createdAt: user.createdAt,
      storeId: stores.id,
      storeName: stores.name,
      storeSlug: stores.slug,
      planId: plans.id,
      planName: plans.name,
      planSlug: plans.slug,
      productLimit: plans.productLimit,
      productCount,
    })
    .from(user)
    .leftJoin(stores, eq(stores.ownerUserId, user.id))
    .leftJoin(subscriptions, eq(subscriptions.storeId, stores.id))
    .leftJoin(plans, eq(plans.id, subscriptions.planId))
    .where(
      term
        ? or(
            ilike(user.name, `%${term}%`),
            ilike(user.email, `%${term}%`),
            ilike(stores.name, `%${term}%`),
            ilike(stores.slug, `%${term}%`),
          )
        : undefined,
    )
    .orderBy(desc(user.createdAt))
    .limit(200)

  const now = Date.now()
  return accounts.map((account) => {
    const blocked = account.status === 'blocked' || account.storeStatus === 'blocked'
    const planExpired = account.subscriptionStatus === 'expired' || Boolean(account.subscriptionExpiresAt && account.subscriptionExpiresAt.getTime() <= now)
    const paymentPending = ['past_due', 'pending', 'unpaid', 'suspended', 'paused', 'cancelled'].includes(account.subscriptionStatus ?? '') || account.storeStatus === 'suspended' || account.status === 'suspended'
    const lifecycleStatus: 'active' | 'suspended' | 'blocked' = blocked ? 'blocked' : planExpired || paymentPending ? 'suspended' : 'active'
    const lifecycleReason = lifecycleStatus !== 'suspended' ? null : planExpired ? 'Plano expirado' : 'Pendência financeira'

    return { ...account, lifecycleStatus, lifecycleReason }
  })
}

export async function setUserStatus(userId: string, status: 'active' | 'blocked') {
  await db.transaction(async (tx) => {
    await tx.update(user).set({ status, updatedAt: new Date() }).where(eq(user.id, userId))
    await tx
      .update(stores)
      .set({ status: status === 'blocked' ? 'blocked' : 'active', updatedAt: new Date() })
      .where(eq(stores.ownerUserId, userId))
    if (status === 'blocked') {
      await tx.delete(session).where(eq(session.userId, userId))
    }
  })
}

export async function getUserById(userId: string) {
  const [row] = await db.select().from(user).where(eq(user.id, userId)).limit(1)
  return row ?? null
}

export async function getStoreById(storeId: string) {
  const [row] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1)
  return row ?? null
}

export async function recordAdminAction(input: {
  adminUserId: string
  action: string
  targetStoreId?: string | null
  details?: Record<string, unknown>
}) {
  await db.insert(adminAuditLog).values({
    adminUserId: input.adminUserId,
    action: input.action,
    targetStoreId: input.targetStoreId ?? null,
    details: input.details ?? {},
  })
}

export async function listRecentAdminActions(limit = 8) {
  return db
    .select({
      id: adminAuditLog.id,
      action: adminAuditLog.action,
      details: adminAuditLog.details,
      createdAt: adminAuditLog.createdAt,
      adminName: user.name,
    })
    .from(adminAuditLog)
    .leftJoin(user, eq(user.id, adminAuditLog.adminUserId))
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(limit)
}
