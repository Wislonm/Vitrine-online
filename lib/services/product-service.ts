import { categoryBelongsToStore } from '@/lib/repositories/categories'
import {
  createProductWithinLimit,
  getProduct,
  updateProduct,
  type ProductInput,
} from '@/lib/repositories/products'
import { isAssetOwnedByStore, removeAssetIfOwned } from '@/lib/storage'
import { replaceProductVariations, type VariationInput } from '@/lib/repositories/variations'

export type SaveProductResult =
  | { ok: true; productId: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

async function validateRelations(storeId: string, input: ProductInput): Promise<Record<string, string[]> | null> {
  if (input.categoryId && !(await categoryBelongsToStore(storeId, input.categoryId))) {
    return { categoryId: ['Categoria inválida'] }
  }
  if (input.imageUrl && !isAssetOwnedByStore(input.imageUrl, storeId)) {
    return { imageUrl: ['Envie a imagem pelo painel'] }
  }
  if (input.galleryImages.some((url) => !isAssetOwnedByStore(url, storeId))) {
    return { galleryImages: ['Envie as imagens da galeria pelo painel'] }
  }
  return null
}

export async function createProduct(storeId: string, input: ProductInput): Promise<SaveProductResult> {
  const fieldErrors = await validateRelations(storeId, input)
  if (fieldErrors) return { ok: false, error: 'Dados inválidos', fieldErrors }

  const result = await createProductWithinLimit(storeId, input)
  if (result.ok) await replaceProductVariations(result.product.id, input.variations)
  if (!result.ok) {
    return {
      ok: false,
      error: `Você atingiu o limite de ${result.limit} produtos do plano único. Exclua um produto para liberar espaço.`,
    }
  }
  return { ok: true, productId: result.product.id }
}

export async function editProduct(
  storeId: string,
  productId: string,
  input: ProductInput,
): Promise<SaveProductResult> {
  const current = await getProduct(storeId, productId)
  if (!current) return { ok: false, error: 'Produto não encontrado' }

  const fieldErrors = await validateRelations(storeId, input)
  if (fieldErrors) return { ok: false, error: 'Dados inválidos', fieldErrors }

  const updated = await updateProduct(storeId, productId, input)
  if (!updated) return { ok: false, error: 'Produto não encontrado' }
  await replaceProductVariations(productId, input.variations)

  if (current.imageUrl && current.imageUrl !== input.imageUrl) {
    await removeAssetIfOwned(current.imageUrl, storeId)
  }
  const retainedGalleryImages = new Set(input.galleryImages)
  await Promise.all(current.galleryImages.filter((url) => !retainedGalleryImages.has(url)).map((url) => removeAssetIfOwned(url, storeId)))
  return { ok: true, productId }
}
