'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSellerContextOrThrow, UnauthorizedError } from '@/lib/session'
import { deleteProduct, getProduct, setProductFlags } from '@/lib/repositories/products'
import { getPlanForStore, hasProductIdentifiersFeature } from '@/lib/repositories/plans'
import { listProductsForOrdering, saveProductOrder } from '@/lib/repositories/products-order'
import { createProduct, editProduct } from '@/lib/services/product-service'
import { productSchema, zodFieldErrors, type ActionResult } from '@/lib/validators'
import { removeAssetIfOwned } from '@/lib/storage'

const SESSION_ERROR = 'Sua sessão expirou. Entre novamente.'

function refresh(slug: string) {
  revalidatePath('/painel/produtos')
  revalidatePath('/painel')
  revalidatePath('/painel/plano')
  revalidatePath(`/${slug}`)
}

export async function saveProductAction(productId: string | null, raw: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const { store } = await getSellerContextOrThrow()
    if (productId !== null && !z.uuid().safeParse(productId).success) return { ok: false, error: 'Produto não encontrado' }

    const rawRecord = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
    const canUseProductIdentifiers = hasProductIdentifiersFeature((await getPlanForStore(store.id))?.plan)
    const existingProduct = !canUseProductIdentifiers && productId ? await getProduct(store.id, productId) : null
    const rawVariations = Array.isArray(rawRecord.variations) ? rawRecord.variations : []
    const variations = rawVariations
      .filter((variation): variation is Record<string, unknown> => Boolean(variation && typeof variation === 'object'))
      .map((variation, position) => ({
        ...variation,
        name: typeof variation.name === 'string' ? variation.name.trim() : '',
        position,
        options: Array.isArray(variation.options)
          ? variation.options.filter((option): option is Record<string, unknown> => Boolean(option && typeof option === 'object') && typeof (option as Record<string, unknown>).label === 'string' && Boolean(String((option as Record<string, unknown>).label).trim())).map((option) => ({ ...option, label: String(option.label).trim(), value: String(option.value ?? option.label).trim() }))
          : [],
      }))
      .filter((variation) => variation.name && variation.options.length > 0)
      .slice(0, 3)
      .map((variation, position) => ({ ...variation, position }))
    const productData: Record<string, unknown> = { ...rawRecord, variations }
    if (!canUseProductIdentifiers) {
      productData.referenceCode = existingProduct?.referenceCode ?? ''
      productData.sku = existingProduct?.sku ?? ''
    }
    const parsed = productSchema.safeParse(productData)
    if (!parsed.success) return { ok: false, error: 'Revise os campos destacados', fieldErrors: zodFieldErrors(parsed.error) }
    const result = productId ? await editProduct(store.id, productId, parsed.data) : await createProduct(store.id, parsed.data)
    if (!result.ok) return { ok: false, error: result.error, fieldErrors: result.fieldErrors }
    refresh(store.slug)
    return { ok: true, data: { id: result.productId }, message: productId ? 'Produto atualizado' : 'Produto criado' }
  } catch (error) {
    if (error instanceof UnauthorizedError) return { ok: false, error: SESSION_ERROR }
    console.error('[products] save', error)
    return { ok: false, error: 'Não foi possível salvar o produto.' }
  }
}

export async function toggleProductAction(productId: string, flag: 'isActive' | 'isPublished', value: boolean): Promise<ActionResult> {
  try {
    const { store } = await getSellerContextOrThrow()
    if (!z.uuid().safeParse(productId).success || !['isActive', 'isPublished'].includes(flag)) return { ok: false, error: 'Produto não encontrado' }
    const updated = await setProductFlags(store.id, productId, { [flag]: value })
    if (!updated) return { ok: false, error: 'Produto não encontrado' }
    refresh(store.slug)
    return { ok: true }
  } catch (error) {
    if (error instanceof UnauthorizedError) return { ok: false, error: SESSION_ERROR }
    console.error('[products] toggle', error)
    return { ok: false, error: 'Não foi possível atualizar o produto.' }
  }
}

export async function deleteProductAction(productId: string): Promise<ActionResult> {
  try {
    const { store } = await getSellerContextOrThrow()
    if (!z.uuid().safeParse(productId).success) return { ok: false, error: 'Produto não encontrado' }
    const removed = await deleteProduct(store.id, productId)
    if (!removed) return { ok: false, error: 'Produto não encontrado' }
    await Promise.all([removed.imageUrl, ...removed.galleryImages].map((url) => removeAssetIfOwned(url, store.id)))
    refresh(store.slug)
    return { ok: true, message: 'Produto excluído' }
  } catch (error) {
    if (error instanceof UnauthorizedError) return { ok: false, error: SESSION_ERROR }
    console.error('[products] delete', error)
    return { ok: false, error: 'Não foi possível excluir o produto.' }
  }
}

export async function reorderProductAction(productId: string, targetProductId: string): Promise<ActionResult> {
  try {
    const { store } = await getSellerContextOrThrow()
    if (!z.uuid().safeParse(productId).success || !z.uuid().safeParse(targetProductId).success) return { ok: false, error: 'Produto inválido' }
    const products = await listProductsForOrdering(store.id)
    const ids = products.map((product) => product.id)
    const from = ids.indexOf(productId)
    const to = ids.indexOf(targetProductId)
    if (from < 0 || to < 0 || from === to) return { ok: true }
    ids.splice(from, 1)
    ids.splice(to, 0, productId)
    await saveProductOrder(store.id, ids)
    refresh(store.slug)
    return { ok: true }
  } catch (error) {
    if (error instanceof UnauthorizedError) return { ok: false, error: SESSION_ERROR }
    console.error('[products] reorder', error)
    return { ok: false, error: 'Não foi possível reordenar os produtos.' }
  }
}
