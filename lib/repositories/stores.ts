import { and, eq, inArray, ne, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  plans,
  storeSettings,
  stores,
  subscriptions,
  user,
  type SocialLinks,
} from '@/lib/db/schema'

export type Store = typeof stores.$inferSelect
export type StoreSettings = typeof storeSettings.$inferSelect

export async function findStoreByOwner(userId: string) {
  const [row] = await db.select().from(stores).where(eq(stores.ownerUserId, userId)).limit(1)
  return row ?? null
}

export async function findStoreBySlug(slug: string) {
  const [row] = await db.select().from(stores).where(eq(stores.slug, slug)).limit(1)
  return row ?? null
}

export async function isSlugTaken(slug: string, exceptStoreId?: string) {
  const [row] = await db
    .select({ id: stores.id })
    .from(stores)
    .where(
      exceptStoreId
        ? and(eq(stores.slug, slug), ne(stores.id, exceptStoreId))
        : eq(stores.slug, slug),
    )
    .limit(1)
  return Boolean(row)
}

export async function getStoreSettings(storeId: string) {
  const [row] = await db
    .select()
    .from(storeSettings)
    .where(eq(storeSettings.storeId, storeId))
    .limit(1)
  return row ?? null
}

export async function createStoreWithDefaults(input: {
  ownerUserId: string
  name: string
  slug: string
  whatsapp: string | null
  contactEmail: string | null
  documentType: 'cpf' | 'cnpj'
  documentNumber: string
}) {
  return db.transaction(async (tx) => {
    const [trialPlan] = await tx.select().from(plans).where(eq(plans.slug, 'trial-default')).limit(1)
    if (!trialPlan || trialPlan.trialDays < 1) throw new Error('Plano padrão de degustação não está configurado')

    const [store] = await tx
      .insert(stores)
      .values({
        ownerUserId: input.ownerUserId,
        name: input.name,
        slug: input.slug,
        whatsapp: input.whatsapp,
        contactEmail: input.contactEmail,
        documentType: input.documentType,
        documentNumber: input.documentNumber,
      })
      .returning()

    await tx.insert(storeSettings).values({ storeId: store.id, displayName: input.name, colorScheme: 'brand' })
    const trialEndsAt = new Date(Date.now() + trialPlan.trialDays * 24 * 60 * 60 * 1000)
    await tx.insert(subscriptions).values({ storeId: store.id, planId: trialPlan.id, status: 'trial', expiresAt: trialEndsAt })
    return store
  })
}

export async function updateStoreAndOwner(
  storeId: string,
  ownerUserId: string,
  ownerName: string,
  data: Partial<
    Pick<
      Store,
      | 'name'
      | 'slug'
      | 'description'
      | 'whatsapp'
      | 'phone'
      | 'contactEmail'
      | 'address'
      | 'city'
      | 'state'
    >
  >,
  socialLinks: SocialLinks,
) {
  await db.transaction(async (tx) => {
    await tx
      .update(stores)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(stores.id, storeId), eq(stores.ownerUserId, ownerUserId)))
    await tx
      .update(storeSettings)
      .set({ socialLinks, updatedAt: new Date() })
      .where(eq(storeSettings.storeId, storeId))
    await tx
      .update(user)
      .set({ name: ownerName, whatsapp: data.whatsapp ?? null, updatedAt: new Date() })
      .where(eq(user.id, ownerUserId))
  })
}

export async function updateStoreSettings(
  storeId: string,
  data: Partial<
    Pick<
      StoreSettings,
      'heroType' | 'bannerUrl' | 'avatarUrl' | 'displayName' | 'heroDescription' | 'colorScheme'
    >
  >,
) {
  await db
    .update(storeSettings)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(storeSettings.storeId, storeId))
}
