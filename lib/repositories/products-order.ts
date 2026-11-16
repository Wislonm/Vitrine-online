import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { products } from '@/lib/db/schema'

export async function listProductsForOrdering(storeId: string) {
  return db.select({ id: products.id }).from(products).where(eq(products.storeId, storeId)).orderBy(asc(products.sortOrder), asc(products.createdAt))
}

export async function saveProductOrder(storeId: string, ids: string[]) {
  await db.transaction(async (tx) => {
    for (const [index, id] of ids.entries()) {
      await tx.update(products).set({ sortOrder: index, updatedAt: new Date() }).where(eq(products.id, id))
    }
  })
}
