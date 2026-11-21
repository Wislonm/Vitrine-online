import 'server-only'

import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { plans, storeDomains, stores, subscriptions, user } from '@/lib/db/schema'
import { getPlanForStore } from '@/lib/repositories/plans'

const EXPIRED_SUBSCRIPTION_STATUSES = new Set(['expired', 'past_due', 'pending', 'paused', 'cancelled', 'suspended'])

export async function hasCustomDomainFeature(storeId: string) {
  const row = await getPlanForStore(storeId)
  return Boolean(row?.plan.isActive && row.plan.features?.custom_domain)
}

export async function resolveCustomDomainHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  const domain = host.startsWith('www.') ? host.slice(4) : host
  const [row] = await db
    .select({
      domain: storeDomains.domain,
      domainEnabled: storeDomains.enabled,
      domainStatus: storeDomains.status,
      slug: stores.slug,
      storeStatus: stores.status,
      ownerStatus: user.status,
      planIsActive: plans.isActive,
      planFeatures: plans.features,
      subscriptionStatus: subscriptions.status,
      subscriptionExpiresAt: subscriptions.expiresAt,
    })
    .from(storeDomains)
    .innerJoin(stores, eq(storeDomains.storeId, stores.id))
    .innerJoin(user, eq(stores.ownerUserId, user.id))
    .innerJoin(subscriptions, eq(subscriptions.storeId, stores.id))
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(storeDomains.domain, domain))
    .limit(1)

  if (!row || !row.domain || row.storeStatus !== 'active' || row.ownerStatus === 'blocked') return null
  const subscriptionExpired = Boolean(
    EXPIRED_SUBSCRIPTION_STATUSES.has(row.subscriptionStatus) ||
    (row.subscriptionExpiresAt && row.subscriptionExpiresAt.getTime() <= Date.now()),
  )
  const canUseCustomDomain = Boolean(
    row.domainStatus === 'active' &&
    row.domainEnabled &&
    row.planIsActive &&
    row.planFeatures?.custom_domain &&
    !subscriptionExpired,
  )

  return { domain: row.domain, slug: row.slug, canUseCustomDomain }
}
