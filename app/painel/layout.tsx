import type { Metadata } from 'next'
import { PanelMobileHeader, PanelMobileNav, PanelSidebar } from '@/components/panel/panel-nav'
import { requireSellerContext } from '@/lib/session'
import { getStoreSettings } from '@/lib/repositories/stores'
import { getStoreThemeStyle } from '@/lib/store-themes'

export const metadata: Metadata = {
  title: { default: 'Painel', template: '%s | Painel Ui Sales' },
  robots: { index: false, follow: false },
}

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user, store, subscriptionExpired } = await requireSellerContext({ allowExpiredPlan: true })
  const settings = await getStoreSettings(store.id)
  const isAdmin = user.role === 'admin'

  return (
    <div className="seller-panel flex min-h-dvh" style={getStoreThemeStyle(settings?.colorScheme)}>
      <PanelSidebar isAdmin={isAdmin} userName={user.name} storeSlug={store.slug} subscriptionExpired={subscriptionExpired} />
      <div className="flex min-w-0 flex-1 flex-col">
        <PanelMobileHeader isAdmin={isAdmin} storeSlug={store.slug} subscriptionExpired={subscriptionExpired} />
        <main className="mx-auto min-w-0 w-full max-w-4xl flex-1 overflow-x-hidden px-5 pt-8 pb-28 md:px-10 md:pt-12 md:pb-16">
          {children}
        </main>
      </div>
      <PanelMobileNav subscriptionExpired={subscriptionExpired} />
    </div>
  )
}
