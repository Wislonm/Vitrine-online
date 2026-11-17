'use client'

import Link from 'next/link'
import type { CSSProperties } from 'react'
import { Heart, ImageIcon, Trash2, X } from 'lucide-react'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { useWishlist } from '@/components/storefront/wishlist-context'
import { formatBRL } from '@/lib/format'

export function WishlistSheet({ open, onOpenChange, slug, storeName, themeStyle }: { open: boolean; onOpenChange: (open: boolean) => void; slug: string; storeName: string; themeStyle?: CSSProperties }) {
  const wishlist = useWishlist()
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent showCloseButton={false} className="gap-0 bg-background p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md" style={themeStyle}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div><SheetTitle className="font-display text-2xl font-semibold">Lista de desejos</SheetTitle><SheetDescription className="text-xs">Itens salvos em {storeName}</SheetDescription></div>
          <SheetClose aria-label="Fechar lista de desejos" className="flex size-11 items-center justify-center rounded-full bg-foreground text-background hover:bg-foreground/85"><X className="size-4" aria-hidden="true" /></SheetClose>
        </div>
        {wishlist.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center"><Heart className="size-8 text-muted-foreground" aria-hidden="true" /><p className="font-display text-xl font-semibold">Sua lista está vazia</p><p className="text-sm text-muted-foreground">Toque no coração dos produtos que você quer guardar.</p></div>
        ) : (
          <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pb-6">
            {wishlist.items.map((item) => (
              <li key={item.productId} className="flex items-center gap-3 rounded-[10px] bg-muted p-2.5">
                <Link href={`/${slug}/${item.productId}`} onClick={() => onOpenChange(false)} className="relative size-20 shrink-0 overflow-hidden rounded-[10px] bg-tile">
                  {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="size-full object-cover" /> : <ImageIcon className="absolute inset-0 m-auto size-5 text-muted-foreground" aria-hidden="true" />}
                </Link>
                <div className="min-w-0 flex-1"><Link href={`/${slug}/${item.productId}`} onClick={() => onOpenChange(false)} className="line-clamp-2 text-sm font-medium hover:underline">{item.name}</Link><p className="mt-1 font-display font-semibold">{formatBRL(item.price)}</p></div>
                <button type="button" onClick={() => wishlist.remove(item.productId)} aria-label={`Remover ${item.name} da lista`} className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-destructive"><Trash2 className="size-4" aria-hidden="true" /></button>
              </li>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  )
}
