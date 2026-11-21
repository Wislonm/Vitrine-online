import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { storeDomains, type StoreDomainVerification } from '@/lib/db/schema'

export function getStoreDomainForStore(storeId: string) {
  return db.query.storeDomains.findFirst({ where: eq(storeDomains.storeId, storeId) })
}

export async function reserveStoreDomain(storeId: string, domain: string) {
  const [row] = await db.insert(storeDomains).values({ storeId, domain }).returning()
  return row
}

export async function updateStoreDomain(
  storeId: string,
  data: {
    status?: 'pending' | 'active' | 'error'
    verification?: StoreDomainVerification
    lastCheckedAt?: Date | null
    verifiedAt?: Date | null
    lastError?: string | null
  },
) {
  const [row] = await db
    .update(storeDomains)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(storeDomains.storeId, storeId))
    .returning()
  return row ?? null
}

export async function removeStoreDomain(storeId: string) {
  await db.delete(storeDomains).where(eq(storeDomains.storeId, storeId))
}

export async function findActiveStoreDomainByHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  const domain = host.startsWith('www.') ? host.slice(4) : host
  const [row] = await db
    .select({ domain: storeDomains.domain, storeId: storeDomains.storeId })
    .from(storeDomains)
    .where(and(eq(storeDomains.domain, domain), eq(storeDomains.status, 'active')))
    .limit(1)
  return row ?? null
}
