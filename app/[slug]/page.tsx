import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { StoreFooter } from '@/components/storefront/store-footer'
import { StoreHero } from '@/components/storefront/store-hero'
import { StoreHeader } from '@/components/storefront/store-header'
import { StorefrontClient } from '@/components/storefront/storefront-client'
import { listPublicCategories, listPublicProducts } from '@/lib/repositories/products'
import { getStoreSettings } from '@/lib/repositories/stores'
import { getPublicStore } from '@/lib/services/public-store'
import { listVariations } from '@/lib/repositories/variations'
import { getStoreThemeStyle } from '@/lib/store-themes'

type Params = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const store = await getPublicStore(slug.toLowerCase())
  if (!store) return { title: 'Vitrine não encontrada', robots: { index: false } }

  const [settings, requestHeaders] = await Promise.all([getStoreSettings(store.id), headers()])
  const title = settings?.displayName || store.name
  const description =
    settings?.heroDescription || store.description || `Conheça a vitrine de ${title} e faça seu pedido pelo WhatsApp.`
  const image = settings?.bannerUrl || settings?.avatarUrl || undefined
  const customDomain = requestHeaders.get('x-store-domain')
  const canonical = customDomain ? `https://${customDomain}/` : `/${store.slug}`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      title,
      description,
      siteName: 'Minha Vitrine',
      locale: 'pt_BR',
      url: canonical,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description, images: image ? [image] : undefined },
  }
}

export default async function StorefrontPage({ params }: Params) {
  const { slug } = await params
  const store = await getPublicStore(slug.toLowerCase())
  if (!store) notFound()

  const [settings, products, categories] = await Promise.all([
    getStoreSettings(store.id),
    listPublicProducts(store.id),
    listPublicCategories(store.id),
  ])
  const productVariations = await Promise.all(products.map((product) => listVariations(product.id)))

  const displayName = settings?.displayName || store.name

  return (
    <StorefrontClient
      slug={store.slug}
      storeName={displayName}
      themeStyle={getStoreThemeStyle(settings?.colorScheme)}
      canReceiveOrders={Boolean(store.whatsapp)}
      storeHeader={<StoreHeader name={displayName} city={[store.city, store.state].filter(Boolean).join(', ')} avatarUrl={settings?.avatarUrl} slug={store.slug} themeStyle={getStoreThemeStyle(settings?.colorScheme)} />}
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        offerPrice: p.offerPrice === null ? null : Number(p.offerPrice),
        priceOnRequest: p.priceOnRequest,
        stockStatus: p.stockStatus as 'in_stock' | 'made_to_order' | 'out_of_stock',
        stockQuantity: p.stockQuantity,
        imageUrl: p.imageUrl,
        galleryImages: p.galleryImages,
        categoryId: p.categoryId,
        variations: (productVariations.find((items) => items[0]?.productId === p.id) ?? []).map((variation) => ({
          id: variation.id,
          name: variation.name,
          selectorType: variation.selectorType as 'text' | 'color' | 'number' | 'image',
          displayOnCard: variation.displayOnCard,
          options: variation.options.map((option) => ({ id: option.id, label: option.label, value: option.value, colorValue: option.colorValue, imageUrl: option.imageUrl })),
        })),
      }))}
      categories={categories}
      hero={
        <StoreHero
          type="banner"
          name={displayName}
          description={null}
          showText={false}
          bannerUrl={settings?.bannerUrl}
          avatarUrl={settings?.avatarUrl}
        />
      }
      footer={
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
      }
    />
  )
}
