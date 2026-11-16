import { asc, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { productVariationOptions, productVariations } from '@/lib/db/schema'

export type VariationOptionInput = { label: string; value: string; colorValue?: string | null; imageUrl?: string | null }
export type VariationInput = {
  id?: string
  name: string
  kind: 'color' | 'size' | 'custom'
  selectorType: 'text' | 'color' | 'number' | 'image'
  displayOnCard: boolean
  position: number
  options: VariationOptionInput[]
}

export async function listVariations(productId: string) {
  const variations = await db.select().from(productVariations).where(eq(productVariations.productId, productId)).orderBy(asc(productVariations.position))
  if (!variations.length) return []
  const options = await db.select().from(productVariationOptions).where(inArray(productVariationOptions.variationId, variations.map((v) => v.id))).orderBy(asc(productVariationOptions.position))
  return variations.map((variation) => ({ ...variation, options: options.filter((option) => option.variationId === variation.id) }))
}

export async function replaceProductVariations(productId: string, inputs: VariationInput[]) {
  return db.transaction(async (tx) => {
    await tx.delete(productVariations).where(eq(productVariations.productId, productId))
    for (const variation of inputs.slice(0, 3)) {
      const [created] = await tx.insert(productVariations).values({
        productId,
        name: variation.name,
        kind: variation.kind,
        selectorType: variation.selectorType,
        displayOnCard: variation.displayOnCard,
        position: variation.position,
      }).returning()
      if (variation.options.length) {
        await tx.insert(productVariationOptions).values(variation.options.map((option, position) => ({
          variationId: created.id,
          label: option.label,
          value: option.value,
          colorValue: option.colorValue ?? null,
          imageUrl: option.imageUrl ?? null,
          position,
        })))
      }
    }
  })
}
