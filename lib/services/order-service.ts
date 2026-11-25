import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { centsToDecimalString, toCents } from '@/lib/format'
import { createOrderWithItems } from '@/lib/repositories/orders'
import { findPublicProductsByIds } from '@/lib/repositories/products'
import { getPlanForStore, isProPlan } from '@/lib/repositories/plans'
import { findStoreBySlug } from '@/lib/repositories/stores'
import { listVariations } from '@/lib/repositories/variations'
import { buildOrderMessage, buildWhatsappUrl } from '@/lib/whatsapp'

export type PlaceOrderInput = {
  slug: string
  customerName: string
  customerPhone: string | null
  notes: string | null
  items: { productId: string; quantity: number; variations?: { variationId: string; optionId: string; optionLabel: string }[] }[]
}

export type PlaceOrderResult =
  | { ok: true; whatsappUrl: string; orderId: string; total: number }
  | { ok: false; status: number; error: string }

/**
 * Recalcula tudo no servidor: preços e nomes vêm do banco, nunca do navegador.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const store = await findStoreBySlug(input.slug)
  if (!store || store.status !== 'active') {
    return { ok: false, status: 404, error: 'Loja não encontrada.' }
  }

  const [owner] = await db
    .select({ status: user.status })
    .from(user)
    .where(eq(user.id, store.ownerUserId))
    .limit(1)
  if (!owner || owner.status === 'blocked') {
    return { ok: false, status: 404, error: 'Loja não encontrada.' }
  }
  const canUseProductIdentifiers = isProPlan((await getPlanForStore(store.id))?.plan)

  if (!store.whatsapp) {
    return {
      ok: false,
      status: 422,
      error: 'Esta loja ainda não cadastrou um WhatsApp para receber pedidos.',
    }
  }

  type CartLine = { productId: string; quantity: number; variations: { variationId: string; optionId: string; optionLabel: string }[] }
  const merged = new Map<string, CartLine>()
  for (const item of input.items) {
    const variations = [...(item.variations ?? [])].sort((a, b) => a.variationId.localeCompare(b.variationId))
    const key = `${item.productId}::${variations.map((variation) => `${variation.variationId}:${variation.optionId}`).join('|')}`
    const current = merged.get(key)
    merged.set(key, {
      productId: item.productId,
      quantity: Math.min((current?.quantity ?? 0) + item.quantity, 99),
      variations: current?.variations ?? variations,
    })
  }

  const productIds = [...new Set([...merged.values()].map((line) => line.productId))]
  const found = await findPublicProductsByIds(store.id, productIds)
  if (found.length !== productIds.length) {
    return {
      ok: false,
      status: 409,
      error: 'Alguns produtos do carrinho não estão mais disponíveis. Revise seu carrinho.',
    }
  }

  const productMap = new Map(found.map((product) => [product.id, product]))
  const variationMap = new Map<string, Awaited<ReturnType<typeof listVariations>>>()
  await Promise.all(productIds.map(async (productId) => variationMap.set(productId, await listVariations(productId))))

  const lines = [...merged.values()].map((cartLine) => {
    const product = productMap.get(cartLine.productId)!
    const canonicalVariations = cartLine.variations.flatMap((selection) => {
      const variation = variationMap.get(product.id)?.find((item) => item.id === selection.variationId)
      const option = variation?.options.find((item) => item.id === selection.optionId)
      return variation && option ? [{ variationId: variation.id, variationName: variation.name, optionLabel: option.label }] : []
    })
    const unitCents = toCents(product.offerPrice ?? product.price)
    return {
      productId: product.id,
      productName: product.name,
      referenceCode: product.referenceCode,
      sku: product.sku,
      quantity: cartLine.quantity,
      unitCents,
      subtotalCents: unitCents * cartLine.quantity,
      priceOnRequest: product.priceOnRequest,
      variations: canonicalVariations,
    }
  })
  const totalCents = lines.reduce((sum, line) => sum + line.subtotalCents, 0)

  const order = await createOrderWithItems({
    storeId: store.id,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    notes: input.notes,
    totalAmount: centsToDecimalString(totalCents),
    items: lines.map((line) => ({
      productId: line.productId,
      productName: line.productName,
      unitPrice: centsToDecimalString(line.unitCents),
      quantity: line.quantity,
      subtotal: centsToDecimalString(line.subtotalCents),
    })),
  })

  const message = buildOrderMessage({
    storeName: store.name,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    notes: input.notes,
    total: totalCents / 100,
    items: lines.map((line) => ({
      name: line.productName,
      referenceCode: canUseProductIdentifiers ? line.referenceCode : null,
      sku: canUseProductIdentifiers ? line.sku : null,
      quantity: line.quantity,
      unitPrice: line.unitCents / 100,
      subtotal: line.subtotalCents / 100,
      priceOnRequest: line.priceOnRequest,
      variations: line.variations.map((variation) => ({ name: variation.variationName, option: variation.optionLabel })),
    })), 
  })

  const whatsappUrl = buildWhatsappUrl(store.whatsapp, message)
  if (!whatsappUrl) {
    return { ok: false, status: 422, error: 'O WhatsApp da loja é inválido.' }
  }

  return { ok: true, whatsappUrl, orderId: order.id, total: totalCents / 100 }
}
