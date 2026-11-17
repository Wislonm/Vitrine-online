'use client'

import { useState, type CSSProperties } from 'react'
import { Heart, Store } from 'lucide-react'
import { WishlistSheet } from '@/components/storefront/wishlist-sheet'
import { useWishlist } from '@/components/storefront/wishlist-context'

export function StoreHeader({ name, city, avatarUrl, slug, themeStyle }: { name: string; city?: string | null; avatarUrl?: string | null; slug: string; themeStyle?: CSSProperties }) {
  const [open, setOpen] = useState(false)
  const wishlist = useWishlist()

  return (
    <>
      <header className="flex items-center justify-between gap-3 px-1 pt-5 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-tile">
            {avatarUrl ? <img src={avatarUrl} alt={`Foto de ${name}`} className="size-full object-cover" /> : <Store className="size-5 text-muted-foreground" aria-hidden="true" />}
          </div>
          <div className="min-w-0"><p className="truncate font-display text-base font-semibold">{name}</p>{city && <p className="truncate text-xs text-muted-foreground">{city}</p>}</div>
        </div>
        <button type="button" onClick={() => setOpen(true)} aria-label={`Abrir lista de desejos, ${wishlist.count} ${wishlist.count === 1 ? 'item' : 'itens'}`} className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-foreground text-background hover:bg-foreground/85">
          <Heart className="size-5" fill={wishlist.count ? 'currentColor' : 'none'} aria-hidden="true" />
          {wishlist.count > 0 && <span className="absolute -top-1 -right-1 min-w-5 rounded-full bg-primary px-1.5 text-center text-[0.7rem] leading-5 text-primary-foreground">{wishlist.count}</span>}
        </button>
      </header>
      <WishlistSheet open={open} onOpenChange={setOpen} slug={slug} storeName={name} themeStyle={themeStyle} />
    </>
  )
}
