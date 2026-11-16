import { and, asc, desc, eq, ilike, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { categories, plans, products, stores, subscriptions } from '@/lib/db/schema'
import type { VariationInput } from '@/lib/repositories/variations'

export type Product = typeof products.$inferSelect

export type ProductInput = {
  name: string
  referenceCode: string | null
  sku: string | null
  galleryImages: string[]
  description: string | null
  price: number
  offerPrice: number | null
  priceOnRequest: boolean
  stockStatus: 'in_stock' | 'made_to_order' | 'out_of_stock'
  stockQuantity: number | null
  categoryId: string | null
  imageUrl: string | null
  isActive: boolean
  isPublished: boolean
  variations: VariationInput[]
}

export async function countProducts(storeId: string) {
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.storeId, storeId))
  return row?.total ?? 0
}

export async function listProducts(storeId: string, options: { search?: string; categoryId?: string; page?: number; pageSize?: number } = {}) {
  const term = options.search?.trim()
  const page = Math.max(options.page ?? 1, 1)
  const pageSize = options.pageSize ?? 15
  const conditions = [eq(products.storeId, storeId)]
  if (term) conditions.push(ilike(products.name, `%${term.replace(/[%_]/g, '')}%`))
  if (options.categoryId && options.categoryId !== 'all') conditions.push(eq(products.categoryId, options.categoryId))
  const where = and(...conditions)
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(products).where(where)
  const items = await db
    .select({
      id: products.id,
      name: products.name,
      referenceCode: products.referenceCode,
      sku: products.sku,
      galleryImages: products.galleryImages,
      description: products.description,
      price: products.price,
      offerPrice: products.offerPrice,
      priceOnRequest: products.priceOnRequest,
      imageUrl: products.imageUrl,
      isActive: products.isActive,
      isPublished: products.isPublished,
      categoryId: products.categoryId,
      categoryName: categories.name,
      createdAt: products.createdAt,
    })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(where)
    .orderBy(products.sortOrder, desc(products.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
  return { items, total, page, pageSize, pageCount: Math.max(Math.ceil(total / pageSize), 1) }
}

export async function getProduct(storeId: string, productId: string) {
  const [row] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.storeId, storeId)))
    .limit(1)
  return row ?? null
}

export async function listPublicProducts(storeId: string) {
  return db
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      price: products.price,
      offerPrice: products.offerPrice,
      priceOnRequest: products.priceOnRequest,
      galleryImages: products.galleryImages,
      stockStatus: products.stockStatus,
      stockQuantity: products.stockQuantity,
      imageUrl: products.imageUrl,
      categoryId: products.categoryId,
    })
    .from(products)
    .where(
      and(
        eq(products.storeId, storeId),
        eq(products.isActive, true),
        eq(products.isPublished, true),
      ),
    )
    .orderBy(asc(products.sortOrder), desc(products.createdAt))
}

export async function listPublicCategories(storeId: string) {
  return db
    .selectDistinct({ id: categories.id, name: categories.name })
    .from(categories)
    .innerJoin(products, eq(products.categoryId, categories.id))
    .where(
      and(
        eq(categories.storeId, storeId),
        eq(products.isActive, true),
        eq(products.isPublished, true),
      ),
    )
    .orderBy(asc(categories.name))
}

export async function findPublicProductsByIds(storeId: string, ids: string[]) {
  if (ids.length === 0) return []
  return db
    .select({ id: products.id, name: products.name, referenceCode: products.referenceCode, sku: products.sku, price: products.price, offerPrice: products.offerPrice })
    .from(products)
    .where(
      and(
        eq(products.storeId, storeId),
        inArray(products.id, ids),
        eq(products.isActive, true),
        eq(products.isPublished, true),
      ),
    )
}

/**
 * Cria um produto respeitando o limite do plano de forma atômica: trava a linha da loja
 * durante a contagem para que requisições simultâneas não ultrapassem o limite.
 */
export async function createProductWithinLimit(storeId: string, input: ProductInput) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select id from ${stores} where ${stores.id} = ${storeId} for update`)

    const [limitRow] = await tx
      .select({ limit: plans.productLimit })
      .from(subscriptions)
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(eq(subscriptions.storeId, storeId))
      .limit(1)
    const limit = limitRow?.limit ?? 0

    const [countRow] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.storeId, storeId))

    if ((countRow?.total ?? 0) >= limit) {
      return { ok: false as const, limit }
    }

    const [positionRow] = await tx
      .select({ min: sql<number>`coalesce(min(${products.sortOrder}), 0)` })
      .from(products)
      .where(eq(products.storeId, storeId))
    const nextSortOrder = (positionRow?.min ?? 0) - 1
    const { variations: _variations, ...productData } = input
    const [row] = await tx
      .insert(products)
      .values({ ...productData, sortOrder: nextSortOrder, offerPrice: input.offerPrice === null ? null : input.offerPrice.toFixed(2), price: input.price.toFixed(2), storeId })
      .returning()
    return { ok: true as const, product: row }
  })
}

export async function updateProduct(storeId: string, productId: string, input: ProductInput) {
  const { variations: _variations, ...productData } = input
  const rows = await db
    .update(products)
    .set({ ...productData, offerPrice: input.offerPrice === null ? null : input.offerPrice.toFixed(2), price: input.price.toFixed(2), updatedAt: new Date() })
    .where(and(eq(products.id, productId), eq(products.storeId, storeId)))
    .returning({ id: products.id })
  return rows.length > 0
}

export async function setProductFlags(
  storeId: string,
  productId: string,
  flags: Partial<Pick<Product, 'isActive' | 'isPublished'>>,
) {
  const rows = await db
    .update(products)
    .set({ ...flags, updatedAt: new Date() })
    .where(and(eq(products.id, productId), eq(products.storeId, storeId)))
    .returning({ id: products.id })
  return rows.length > 0
}

export async function deleteProduct(storeId: string, productId: string) {
  const rows = await db
    .delete(products)
    .where(and(eq(products.id, productId), eq(products.storeId, storeId)))
    .returning({ id: products.id, imageUrl: products.imageUrl, galleryImages: products.galleryImages })
  return rows[0] ?? null
}
