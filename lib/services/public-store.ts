import { cache } from 'react'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { findStoreBySlug } from '@/lib/repositories/stores'

/** Retorna a loja somente se ela e a conta do dono estiverem ativas. */
export const getPublicStore = cache(async (slug: string) => {
  const store = await findStoreBySlug(slug)
  if (!store || store.status !== 'active') return null

  const [owner] = await db
    .select({ status: user.status })
    .from(user)
    .where(eq(user.id, store.ownerUserId))
    .limit(1)
  if (!owner || owner.status === 'blocked') return null

  return store
})
