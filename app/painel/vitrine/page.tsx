import type { Metadata } from 'next'
import { HeroForm } from '@/components/panel/hero-form'
import { PageHeader } from '@/components/panel/page-header'
import { getStoreSettings } from '@/lib/repositories/stores'
import { requireSellerContext } from '@/lib/session'
import type { StoreThemeId } from '@/lib/store-themes'

export const metadata: Metadata = { title: 'Personalizar vitrine' }

export default async function StorefrontSettingsPage() {
  const { store } = await requireSellerContext()
  const settings = await getStoreSettings(store.id)

  return (
    <>
      <PageHeader
        title="Personalizar vitrine"
        description="Personalize as imagens e textos exibidos na sua loja."
      />
      <HeroForm
        initial={{
          heroType: settings?.heroType ?? 'banner_avatar',
          displayName: settings?.displayName ?? store.name,
          heroDescription: settings?.heroDescription ?? '',
          bannerUrl: settings?.bannerUrl ?? null,
          avatarUrl: settings?.avatarUrl ?? null,
          colorScheme: (settings?.colorScheme ?? 'brand') as StoreThemeId,
        }}
      />
    </>
  )
}
