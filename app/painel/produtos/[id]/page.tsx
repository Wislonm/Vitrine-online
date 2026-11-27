import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { PageHeader } from '@/components/panel/page-header'
import { ProductForm } from '@/components/panel/product-form'
import { listCategoryOptions } from '@/lib/repositories/categories'
import { getProduct } from '@/lib/repositories/products'
import { hasProductIdentifiersFeature } from '@/lib/repositories/plans'
import { listVariations } from '@/lib/repositories/variations'
import { getPlanUsage } from '@/lib/services/plan-usage'
import { requireSellerContext } from '@/lib/session'

export const metadata: Metadata = { title: 'Editar produto' }

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()

  const { store } = await requireSellerContext()
  const [product, categories, variations, usage] = await Promise.all([getProduct(store.id, id), listCategoryOptions(store.id), listVariations(id), getPlanUsage(store.id)])
  if (!product) notFound()

  return (
    <>
      <PageHeader title="Editar produto" description={product.name} />
      <ProductForm
        productId={product.id}
        categories={categories}
        canUseProductIdentifiers={hasProductIdentifiersFeature(usage.plan)}
        initial={{
          name: product.name,
          referenceCode: product.referenceCode,
          sku: product.sku,
          description: product.description,
          price: product.price,
          offerPrice: product.offerPrice,
          priceOnRequest: product.priceOnRequest,
          stockStatus: product.stockStatus as 'in_stock' | 'made_to_order' | 'out_of_stock',
          stockQuantity: product.stockQuantity,
          categoryId: product.categoryId,
          imageUrl: product.imageUrl,
          galleryImages: product.galleryImages,
          isActive: product.isActive,
          isPublished: product.isPublished,
          variations: variations.map((variation) => ({
            id: variation.id,
            name: variation.name,
            kind: variation.kind as 'color' | 'size' | 'custom',
            selectorType: variation.selectorType as 'text' | 'color' | 'number' | 'image',
            displayOnCard: variation.displayOnCard,
            position: variation.position,
            options: variation.options.map((option) => ({ label: option.label, value: option.value, colorValue: option.colorValue, imageUrl: option.imageUrl })),
          })),
        }}
      />
    </>
  )
}
