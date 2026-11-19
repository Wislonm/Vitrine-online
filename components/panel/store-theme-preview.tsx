'use client'

import { Store } from 'lucide-react'
import { StoreHero } from '@/components/storefront/store-hero'
import { ALL_STORE_THEMES, getStoreThemeStyle, type StoreThemeId } from '@/lib/store-themes'

type StoreThemePreviewProps = {
  displayName: string
  description: string
  bannerUrl: string | null
  avatarUrl: string | null
  themeId: StoreThemeId
}

export function StoreThemePreview({ displayName, description, bannerUrl, avatarUrl, themeId }: StoreThemePreviewProps) {
  const storeName = displayName.trim() || 'Sua loja'
  const activeTheme = ALL_STORE_THEMES.find((theme) => theme.id === themeId)

  return (
    <aside aria-label="Prévia ao vivo da vitrine" className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-6 lg:self-start">
      <div>
        <h2 className="text-sm font-semibold">Prévia ao vivo</h2>
        <p className="text-xs text-muted-foreground">A paleta muda conforme sua seleção.</p>
      </div>
      <div className="overflow-hidden rounded-3xl border bg-background shadow-sm" style={getStoreThemeStyle(themeId)}>
        <div className="flex items-center justify-between border-b px-4 py-3 text-xs">
          <span className="flex items-center gap-2 font-medium">
            <Store className="size-4 text-primary" aria-hidden="true" />
            Vitrine pública
          </span>
          <span className="rounded-full bg-accent px-2.5 py-1 text-accent-foreground">{activeTheme?.name ?? 'Prévia'}</span>
        </div>
        <div className="p-4">
          <StoreHero
            type="banner_avatar"
            name={storeName}
            description={description}
            bannerUrl={bannerUrl}
            avatarUrl={avatarUrl}
            compact
          />
          <div className="mt-4 flex flex-wrap gap-2" aria-hidden="true">
            <span className="rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Todas</span>
            <span className="rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground">Novidades</span>
          </div>
          <div className="mt-4 rounded-2xl border bg-muted p-4">
            <p className="text-xs text-muted-foreground">Exemplo de ação na loja</p>
            <span className="mt-3 inline-flex rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground">
              Ver produtos
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
