import { and, inArray, ne, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { stores, user } from '@/lib/db/schema'

function phoneVariants(value: string) {
  const digits = value.replace(/\D/g, '')
  const local = digits.startsWith('55') && (digits.length === 12 || digits.length === 13) ? digits.slice(2) : digits
  if (local.length === 10 || local.length === 11) return [local, `55${local}`]
  return digits ? [digits] : []
}

export async function isWhatsappRegistered(value: string, exceptUserId?: string) {
  const variants = phoneVariants(value)
  if (variants.length === 0) return false
  const normalizedWhatsapp = sql<string>`regexp_replace(coalesce(${user.whatsapp}, ''), '[^0-9]', '', 'g')`
  const conditions = [inArray(normalizedWhatsapp, variants)]
  if (exceptUserId) conditions.push(ne(user.id, exceptUserId))
  const [userMatch] = await db.select({ id: user.id }).from(user).where(and(...conditions)).limit(1)
  if (userMatch) return true

  const storeWhatsapp = sql<string>`regexp_replace(coalesce(${stores.whatsapp}, ''), '[^0-9]', '', 'g')`
  const storePhone = sql<string>`regexp_replace(coalesce(${stores.phone}, ''), '[^0-9]', '', 'g')`
  const storeConditions = [or(inArray(storeWhatsapp, variants), inArray(storePhone, variants))!]
  if (exceptUserId) storeConditions.push(ne(stores.ownerUserId, exceptUserId))
  const [storeMatch] = await db.select({ id: stores.id }).from(stores).where(and(...storeConditions)).limit(1)
  return Boolean(storeMatch)
}

export async function isEmailRegistered(email: string, exceptUserId?: string, exceptStoreId?: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const userConditions = [sql`lower(${user.email}) = ${normalizedEmail}`]
  if (exceptUserId) userConditions.push(ne(user.id, exceptUserId))
  const [userMatch] = await db.select({ id: user.id }).from(user).where(and(...userConditions)).limit(1)
  if (userMatch) return true

  const storeConditions = [sql`lower(${stores.contactEmail}) = ${normalizedEmail}`]
  if (exceptStoreId) storeConditions.push(ne(stores.id, exceptStoreId))
  const [storeMatch] = await db.select({ id: stores.id }).from(stores).where(and(...storeConditions)).limit(1)
  return Boolean(storeMatch)
}

export async function isStorePhoneRegistered(value: string, exceptStoreId: string) {
  const variants = phoneVariants(value)
  if (variants.length === 0) return false
  const normalizedPhone = sql<string>`regexp_replace(coalesce(${stores.phone}, ''), '[^0-9]', '', 'g')`
  const normalizedWhatsapp = sql<string>`regexp_replace(coalesce(${stores.whatsapp}, ''), '[^0-9]', '', 'g')`
  const [match] = await db.select({ id: stores.id }).from(stores).where(and(ne(stores.id, exceptStoreId), or(inArray(normalizedPhone, variants), inArray(normalizedWhatsapp, variants))!)).limit(1)
  return Boolean(match)
}
