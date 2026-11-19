'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { updateHeroAction } from '@/app/actions/store'
import { ImageUploader } from '@/components/panel/image-uploader'
import type { HeroType } from '@/components/storefront/store-hero'
import { Button } from '@/components/ui/button'
import { STORE_THEMES, type StoreThemeId } from '@/lib/store-themes'
import { StoreThemePreview } from '@/components/panel/store-theme-preview'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { FieldErrors } from '@/lib/validators'

type HeroFormProps = {
  initial: {
    heroType: HeroType
    displayName: string
    heroDescription: string
    bannerUrl: string | null
    avatarUrl: string | null
    colorScheme: StoreThemeId
  }
}

export function HeroForm({ initial }: HeroFormProps) {
  const [pending, startTransition] = useTransition()
  const [errors, setErrors] = useState<FieldErrors>({})
  const [displayName, setDisplayName] = useState(initial.displayName)
  const [heroDescription, setHeroDescription] = useState(initial.heroDescription)
  const [bannerUrl, setBannerUrl] = useState<string | null>(initial.bannerUrl)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initial.avatarUrl)
  const [colorScheme, setColorScheme] = useState<StoreThemeId>(initial.colorScheme)

  const heroType: HeroType = 'banner_avatar'
  const showBanner = true
  const showAvatar = true

  function save() {
    startTransition(async () => {
      const result = await updateHeroAction({
        heroType,
        displayName,
        heroDescription,
        bannerUrl: showBanner ? (bannerUrl ?? '') : '',
        avatarUrl: showAvatar ? (avatarUrl ?? '') : '',
        colorScheme,
      })
      if (result.ok) {
        setErrors({})
        toast.success(result.message ?? 'Vitrine atualizada')
      } else {
        setErrors(result.fieldErrors ?? {})
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="grid min-w-0 w-full gap-10 overflow-hidden lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 w-full flex-col gap-8 overflow-hidden">
        <div className="flex flex-col gap-5">
          <Field label="Nome exibido" htmlFor="displayName" error={errors.displayName?.[0]}>
            <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} />
          </Field>
          <Field label="Descrição" htmlFor="heroDescription" error={errors.heroDescription?.[0]}>
            <Textarea
              id="heroDescription"
              value={heroDescription}
              onChange={(e) => setHeroDescription(e.target.value)}
              maxLength={300}
              placeholder="Conte em uma frase o que você vende"
            />
          </Field>
          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-medium">Esquema de cores</legend>
            <p className="text-xs text-muted-foreground">Escolha uma paleta harmônica para o painel e a loja. O fundo permanece branco.</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {STORE_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setColorScheme(theme.id)}
                  aria-pressed={colorScheme === theme.id}
                  className="flex min-w-0 items-center gap-2 rounded-xl border p-2 text-left text-xs transition-colors hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  style={{
                    backgroundColor: theme.muted,
                    borderColor: colorScheme === theme.id ? theme.primary : theme.tile,
                    color: theme.surfaceText,
                    boxShadow: colorScheme === theme.id ? `0 0 0 2px ${theme.ring}55` : undefined,
                  }}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border/60" style={{ backgroundColor: theme.primary }}>
                    <span className="size-2 rounded-full bg-white/90" />
                  </span>
                  <span className="truncate">{theme.name}</span>
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </div>

      <div className="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2">
        <StoreThemePreview
          displayName={displayName}
          description={heroDescription}
          bannerUrl={bannerUrl}
          avatarUrl={avatarUrl}
          themeId={colorScheme}
        />
      </div>

      <div className="flex min-w-0 w-full flex-col gap-6 lg:col-start-1 lg:row-start-2">
        {(showBanner || showAvatar) && (
          <div className="flex flex-col gap-6">
            {showBanner && <ImageUploader kind="banner" shape="wide" label="Banner" value={bannerUrl} onChange={setBannerUrl} className="min-w-0 max-w-full" />}
            {showAvatar && <ImageUploader kind="avatar" shape="circle" label="Sua foto" value={avatarUrl} onChange={setAvatarUrl} />}
          </div>
        )}

        <div>
          <Button type="button" size="lg" onClick={save} disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
            Salvar vitrine
          </Button>
        </div>
      </div>
    </div>
  )
}
