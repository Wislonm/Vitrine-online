import { and, asc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { categories, products } from '@/lib/db/schema'

export async function listCategories(storeId: string) {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      productCount: sql<number>`count(${products.id})::int`,
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .where(eq(categories.storeId, storeId))
    .groupBy(categories.id)
    .orderBy(asc(categories.name))
}

export async function listCategoryOptions(storeId: string) {
  return db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.storeId, storeId))
    .orderBy(asc(categories.name))
}

export async function categoryBelongsToStore(storeId: string, categoryId: string) {
  const [row] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.storeId, storeId)))
    .limit(1)
  return Boolean(row)
}

export async function createCategory(storeId: string, name: string) {
  const [row] = await db.insert(categories).values({ storeId, name }).returning()
  return row
}

export async function renameCategory(storeId: string, categoryId: string, name: string) {
  const rows = await db
    .update(categories)
    .set({ name, updatedAt: new Date() })
    .where(and(eq(categories.id, categoryId), eq(categories.storeId, storeId)))
    .returning({ id: categories.id })
  return rows.length > 0
}

export async function deleteCategory(storeId: string, categoryId: string) {
  const rows = await db
    .delete(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.storeId, storeId)))
    .returning({ id: categories.id })
  return rows.length > 0
}
