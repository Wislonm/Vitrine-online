import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { CartProvider } from '@/components/storefront/cart-context'
import { ProductDetail } from '@/components/storefront/product-detail'
import { StoreFooter } from '@/components/storefront/store-footer'
import { getProduct } from '@/lib/repositories/products'
import { getPlanForStore, hasProductIdentifiersFeature } from '@/lib/repositories/plans'
import { listVariations } from '@/lib/repositories/variations'
import { getStoreSettings } from '@/lib/repositories/stores'
import { getPublicStore } from '@/lib/services/public-store'
import { getStoreThemeStyle } from '@/lib/store-themes'

export async function generateMetadata({ params }: { params: Promise<{ slug: string; productId: string }> }): Promise<Metadata> {
  const { slug, productId } = await params
  const store = await getPublicStore(slug.toLowerCase())
  if (!store) return { title: 'Produto não encontrado', robots: { index: false } }
  const [product, requestHeaders] = await Promise.all([getProduct(store.id, productId), headers()])
  if (!product || !product.isActive || !product.isPublished) return { title: 'Produto não encontrado', robots: { index: false } }
  const customDomain = requestHeaders.get('x-store-domain')
  const canonical = customDomain ? `https://${customDomain}/${productId}` : `/${store.slug}/${productId}`
  const image = product.imageUrl || product.galleryImages[0] || undefined
  const description = product.description || `Conheça ${product.name} na vitrine ${store.name} e faça seu pedido pelo WhatsApp.`
  return {
    title: product.name,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      title: product.name,
      description,
      siteName: 'Minha Vitrine',
      locale: 'pt_BR',
      url: canonical,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: { card: image ? 'summary_large_image' : 'summary', title: product.name, description, images: image ? [image] : undefined },
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string; productId: string }> }) {
  const { slug, productId } = await params
  const store = await getPublicStore(slug.toLowerCase())
  if (!store) notFound()

  const [product, variations, settings, planRow] = await Promise.all([
    getProduct(store.id, productId),
    listVariations(productId),
    getStoreSettings(store.id),
    getPlanForStore(store.id),
  ])
  if (!product || !product.isActive || !product.isPublished) notFound()

  const displayName = settings?.displayName || store.name
  const themeStyle = getStoreThemeStyle(settings?.colorScheme)

  return (
    <CartProvider storeSlug={store.slug}>
      <div className="min-h-dvh bg-background" style={themeStyle}>
      <ProductDetail
        slug={store.slug}
        storeName={displayName}
        canReceiveOrders={Boolean(store.whatsapp)}
        canUseProductIdentifiers={hasProductIdentifiersFeature(planRow?.plan)}
        themeStyle={themeStyle}
        product={{
          id: product.id,
          name: product.name,
          referenceCode: product.referenceCode,
          sku: product.sku,
          description: product.description,
          price: Number(product.price),
          offerPrice: product.offerPrice === null ? null : Number(product.offerPrice),
          priceOnRequest: product.priceOnRequest,
          stockStatus: product.stockStatus as 'in_stock' | 'made_to_order' | 'out_of_stock',
          stockQuantity: product.stockQuantity,
          imageUrl: product.imageUrl,
          galleryImages: product.galleryImages,
          categoryId: product.categoryId,
          variations: variations.map((variation) => ({
            id: variation.id,
            name: variation.name,
            selectorType: variation.selectorType as 'text' | 'color' | 'number' | 'image',
            displayOnCard: variation.displayOnCard,
            options: variation.options.map((option) => ({
              id: option.id,
              label: option.label,
              value: option.value,
              colorValue: option.colorValue,
              imageUrl: option.imageUrl,
            })),
          })),
        }}
      />
      <div className="mx-auto flex w-full max-w-5xl flex-col px-4 pb-28 sm:px-5">
        <StoreFooter
          name={displayName}
          description={store.description}
          whatsapp={store.whatsapp}
          phone={store.phone}
          email={store.contactEmail}
          address={store.address}
          city={store.city}
          state={store.state}
          documentType={store.documentType}
          documentNumber={store.documentNumber}
          social={settings?.socialLinks ?? {}}
        />
      </div>
      </div>
    </CartProvider>
  )
}
