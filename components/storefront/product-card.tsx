'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Heart, ImageIcon, Plus, SlidersHorizontal } from 'lucide-react'
import { useWishlist } from '@/components/storefront/wishlist-context'
import { toast } from 'sonner'
import { useCart } from '@/components/storefront/cart-context'
import { formatBRL } from '@/lib/format'

export type StorefrontVariation = {
  id: string
  name: string
  selectorType: 'text' | 'color' | 'number' | 'image'
  displayOnCard: boolean
  options: { id: string; label: string; value: string; colorValue: string | null; imageUrl: string | null }[]
}

export type StorefrontProduct = {
  id: string
  name: string
  referenceCode?: string | null
  sku?: string | null
  description: string | null
  price: number
  offerPrice: number | null
  priceOnRequest: boolean
  stockStatus: 'in_stock' | 'made_to_order' | 'out_of_stock'
  stockQuantity: number | null
  imageUrl: string | null
  galleryImages: string[]
  categoryId: string | null
  variations: StorefrontVariation[]
}

export function ProductCard({ product, slug }: { product: StorefrontProduct; slug: string }) {
  const { add } = useCart()
  const wishlist = useWishlist()
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const visibleVariation = product.variations.find((variation) => variation.displayOnCard)
  const hasVariations = product.variations.length > 0
  const requiresDetail = product.variations.length > 1
  const selectedOption = visibleVariation?.options.find((option) => option.id === selectedOptionId)

  function handleAdd() {
    if (hasVariations && (!visibleVariation || !selectedOption)) {
      toast.error('Escolha uma variação antes de adicionar ao carrinho')
      return
    }
    add({
      productId: product.id,
      name: product.name,
      price: product.offerPrice ?? product.price,
      imageUrl: product.imageUrl,
      variationSelections: visibleVariation && selectedOption
        ? [{ variationId: visibleVariation.id, variationName: visibleVariation.name, optionId: selectedOption.id, optionLabel: selectedOption.label }]
        : [],
    })
    toast.success(`${product.name} foi para o carrinho`)
  }

  const productLink = `/${slug}/${product.id}`

  return (
    <li className="flex min-w-0 max-w-full flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-[2em] bg-tile">
        <Link href={productLink} aria-label={`Ver detalhes de ${product.name}`} className="block size-full">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt={product.name} loading="lazy" className="size-full object-cover transition-transform duration-500 hover:scale-[1.03]" />
          ) : (
            <ImageIcon className="absolute inset-0 m-auto size-8 text-muted-foreground/60" aria-hidden="true" />
          )}
        </Link>
        <button type="button" onClick={() => wishlist.toggle({ productId: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl })} aria-label={wishlist.has(product.id) ? `Remover ${product.name} da lista de desejos` : `Adicionar ${product.name} à lista de desejos`} className="absolute top-3 right-3 flex size-10 items-center justify-center rounded-full bg-foreground text-background shadow-sm hover:bg-foreground/85">
          <Heart className="size-4" fill={wishlist.has(product.id) ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-1 px-1">
        <Link href={productLink} className="line-clamp-2 font-display text-base leading-snug font-medium hover:underline hover:underline-offset-4">
          {product.name}
        </Link>
        {product.description && <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{product.description}</p>}
      </div>

      {visibleVariation && (
        <fieldset className="flex min-w-0 max-w-full flex-nowrap gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Opções de variação">
          {visibleVariation.options.slice(0, 6).map((option) => {
            const selected = selectedOptionId === option.id
            const isColor = visibleVariation.selectorType === 'color' && option.colorValue
            const isImage = visibleVariation.selectorType === 'image' && option.imageUrl
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelectedOptionId(option.id)}
                aria-label={isColor ? `Selecionar cor ${option.label}` : isImage ? `Selecionar textura ${option.label}` : `Selecionar ${option.label}`}
                aria-pressed={selected}
                className={isColor || isImage
                  ? `flex size-8 shrink-0 items-center justify-center rounded-full ${isColor ? 'border' : 'border-2'} bg-foreground text-background transition-transform ${selected ? 'scale-110 border-primary ring-2 ring-primary' : 'border-foreground'}`
                  : `shrink-0 rounded-full bg-foreground px-2.5 py-1 text-[0.7rem] text-background transition-colors ${selected ? 'ring-2 ring-primary' : 'hover:bg-foreground/85'}`}
              >
                {isColor ? <i className="size-4 rounded-full" style={{ backgroundColor: option.colorValue ?? undefined }} /> : isImage ? <img src={option.imageUrl ?? ''} alt="" className="size-6 rounded-full object-cover" /> : option.value || option.label}
              </button>
            )
          })}
        </fieldset>
      )}

      <div className="flex items-center justify-between gap-3 px-1">
        {product.priceOnRequest ? (
          <p className="font-display text-base font-semibold">Sob consulta</p>
        ) : (
          <div className="flex flex-col items-start gap-0.5">
            {product.offerPrice !== null && <span className="text-xs text-muted-foreground line-through">{formatBRL(product.price)}</span>}
            <p className="font-display text-lg font-semibold">{formatBRL(product.offerPrice ?? product.price)}</p>
          </div>
        )}
        {requiresDetail ? (
          <Link href={productLink} aria-label={`Escolher variações de ${product.name}`} className="flex size-11 items-center justify-center rounded-full bg-foreground text-background hover:bg-foreground/85">
            <SlidersHorizontal className="size-5" aria-hidden="true" />
          </Link>
        ) : (
          <button type="button" onClick={handleAdd} disabled={hasVariations && !selectedOption} aria-label={hasVariations ? `Escolha uma variação de ${product.name}` : `Adicionar ${product.name} ao carrinho`} className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-foreground text-background transition-transform hover:bg-foreground/85 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40">
            <Plus className="size-5" aria-hidden="true" />
          </button>
        )}
      </div>
    </li>
  )
}
