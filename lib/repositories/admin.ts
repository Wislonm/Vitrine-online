import { desc, eq, ilike, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { adminAuditLog, orders, plans, productVariationOptions, productVariations, products, session, storeSettings, stores, subscriptions, user, verification } from '@/lib/db/schema'

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
    trial: count('trial-default'),
    pro: count('business'),
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
      mercadoPagoStatus: subscriptions.mercadoPagoStatus,
      billingPeriod: subscriptions.mercadoPagoBillingPeriod,
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
    const paymentReversed = ['refunded', 'charged_back', 'chargeback'].includes(account.mercadoPagoStatus ?? '')
    const lifecycleStatus: 'active' | 'suspended' | 'blocked' = blocked ? 'blocked' : planExpired || paymentPending ? 'suspended' : 'active'
    const lifecycleReason = lifecycleStatus !== 'suspended' ? null : paymentReversed ? 'Pagamento contestado/estornado' : planExpired ? 'Plano expirado' : 'Pendência financeira'

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

export async function getAccountDeletionSnapshot(userId: string) {
  const [row] = await db
    .select({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      storeId: stores.id,
      storeStatus: stores.status,
      preapprovalId: subscriptions.mercadoPagoPreapprovalId,
      paymentId: subscriptions.mercadoPagoPaymentId,
      paymentStatus: subscriptions.mercadoPagoStatus,
      checkoutStartedAt: subscriptions.mercadoPagoCheckoutStartedAt,
    })
    .from(user)
    .leftJoin(stores, eq(stores.ownerUserId, user.id))
    .leftJoin(subscriptions, eq(subscriptions.storeId, stores.id))
    .where(eq(user.id, userId))
    .limit(1)
  return row ?? null
}

export async function deleteAccountPermanently(input: {
  userId: string
  adminUserId: string
  confirmationEmail: string
  cancelledPreapprovalId: string | null
  resolvedPaymentId: string | null
}) {
  return db.transaction(async (tx) => {
    const [target] = await tx
      .select({ id: user.id, email: user.email, name: user.name, role: user.role, image: user.image })
      .from(user)
      .where(eq(user.id, input.userId))
      .limit(1)
    if (!target) return { status: 'not_found' as const }
    if (target.id === input.adminUserId) return { status: 'self' as const }
    if (target.role === 'admin') return { status: 'admin' as const }
    if (target.email.trim().toLowerCase() !== input.confirmationEmail.trim().toLowerCase()) {
      return { status: 'email_mismatch' as const }
    }

    const [store] = await tx
      .select({ id: stores.id, name: stores.name, status: stores.status })
      .from(stores)
      .where(eq(stores.ownerUserId, target.id))
      .limit(1)
    if (!store || store.status !== 'blocked') return { status: 'store_not_blocked' as const }

    const [billing] = store
      ? await tx
          .select({
            preapprovalId: subscriptions.mercadoPagoPreapprovalId,
            paymentId: subscriptions.mercadoPagoPaymentId,
            providerStatus: subscriptions.mercadoPagoStatus,
            checkoutStartedAt: subscriptions.mercadoPagoCheckoutStartedAt,
          })
          .from(subscriptions)
          .where(eq(subscriptions.storeId, store.id))
          .limit(1)
      : [undefined]
    const terminalPreapprovalStatuses = ['cancelled', 'canceled', 'rejected', 'expired']
    const preapprovalNeedsCancellation = Boolean(billing?.preapprovalId && !terminalPreapprovalStatuses.includes(billing.providerStatus ?? ''))
    if (preapprovalNeedsCancellation && input.cancelledPreapprovalId !== billing?.preapprovalId) {
      return { status: 'billing_cancellation_required' as const }
    }
    const paymentNeedsCancellation = Boolean(billing?.paymentId && ['pending', 'in_process', 'processing'].includes(billing.providerStatus ?? ''))
    if (paymentNeedsCancellation && input.resolvedPaymentId !== billing?.paymentId) {
      return { status: 'billing_cancellation_required' as const }
    }
    if (billing?.checkoutStartedAt && !billing.preapprovalId && !billing.paymentId) {
      return { status: 'checkout_processing' as const }
    }

    const assetUrls = new Set<string>()
    if (target.image) assetUrls.add(target.image)

    let productCount = 0
    let orderCount = 0
    if (store) {
      const [productsTotal] = await tx
        .select({ total: sql<number>`count(*)::int` })
        .from(products)
        .where(eq(products.storeId, store.id))
      const [ordersTotal] = await tx
        .select({ total: sql<number>`count(*)::int` })
        .from(orders)
        .where(eq(orders.storeId, store.id))
      productCount = productsTotal?.total ?? 0
      orderCount = ordersTotal?.total ?? 0

      const [settings] = await tx
        .select({ bannerUrl: storeSettings.bannerUrl, avatarUrl: storeSettings.avatarUrl })
        .from(storeSettings)
        .where(eq(storeSettings.storeId, store.id))
        .limit(1)
      if (settings?.bannerUrl) assetUrls.add(settings.bannerUrl)
      if (settings?.avatarUrl) assetUrls.add(settings.avatarUrl)

      const productImages = await tx
        .select({ imageUrl: products.imageUrl, galleryImages: products.galleryImages })
        .from(products)
        .where(eq(products.storeId, store.id))
      for (const product of productImages) {
        if (product.imageUrl) assetUrls.add(product.imageUrl)
        for (const imageUrl of product.galleryImages ?? []) assetUrls.add(imageUrl)
      }

      const variationImages = await tx
        .select({ imageUrl: productVariationOptions.imageUrl })
        .from(productVariationOptions)
        .innerJoin(productVariations, eq(productVariationOptions.variationId, productVariations.id))
        .innerJoin(products, eq(productVariations.productId, products.id))
        .where(eq(products.storeId, store.id))
      for (const option of variationImages) {
        if (option.imageUrl) assetUrls.add(option.imageUrl)
      }
    }

    await tx.insert(adminAuditLog).values({
      adminUserId: input.adminUserId,
      action: 'delete_account',
      targetStoreId: store?.id ?? null,
      details: {
        deletedUserId: target.id,
        email: target.email,
        name: target.name,
        storeName: store?.name ?? null,
        productCount,
        orderCount,
        mediaCount: assetUrls.size,
        recurringCancelled: Boolean(input.cancelledPreapprovalId),
        pendingPaymentResolved: Boolean(input.resolvedPaymentId),
      },
    })
    await tx.delete(verification).where(or(eq(verification.value, target.id), eq(verification.identifier, target.email)))
    await tx.delete(user).where(eq(user.id, target.id))

    return {
      status: 'deleted' as const,
      userId: target.id,
      email: target.email,
      storeId: store?.id ?? null,
      assetUrls: [...assetUrls],
      productCount,
      orderCount,
    }
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
