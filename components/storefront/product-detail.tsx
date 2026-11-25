'use client'

import Link from 'next/link'
import { useMemo, useState, type CSSProperties } from 'react'
import { ArrowLeft, Check, ImageIcon, Minus, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { CartSheet } from '@/components/storefront/cart-sheet'
import { useCart, type CartItem } from '@/components/storefront/cart-context'
import type { StorefrontProduct, StorefrontVariation } from '@/components/storefront/product-card'
import { formatBRL } from '@/lib/format'

export function ProductDetail({ product, slug, storeName, canReceiveOrders, canUseProductIdentifiers, themeStyle }: { product: StorefrontProduct; slug: string; storeName: string; canReceiveOrders: boolean; canUseProductIdentifiers: boolean; themeStyle?: CSSProperties }) {
  const { add, count, total } = useCart()
  const [cartOpen, setCartOpen] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const productImages = [product.imageUrl, ...product.galleryImages].filter((image): image is string => Boolean(image))
  const [selectedImage, setSelectedImage] = useState(product.imageUrl ?? product.galleryImages[0] ?? null)
  const [selected, setSelected] = useState<Record<string, string>>(() => Object.fromEntries(product.variations.map((v) => [v.id, v.options[0]?.id ?? ''])))
  const selectedOptions = useMemo(() => product.variations.map((variation) => {
    const option = variation.options.find((item) => item.id === selected[variation.id])
    return option ? { variationId: variation.id, variationName: variation.name, optionId: option.id, optionLabel: option.label } : null
  }).filter(Boolean) as NonNullable<CartItem['variationSelections']>, [product.variations, selected])
  const ready = selectedOptions.length === product.variations.length
  const canAddToCart = ready && product.stockStatus !== 'out_of_stock'

  function addToCart() {
    if (!ready) return toast.error('Escolha todas as variações')
    if (product.stockStatus === 'out_of_stock') return toast.error('Este produto está fora de estoque')
    for (let index = 0; index < quantity; index += 1) {
      add({ productId: product.id, name: product.name, price: product.offerPrice ?? product.price, imageUrl: product.imageUrl, variationSelections: selectedOptions })
    }
    toast.success(`${product.name} foi para o carrinho`)
  }

  return (
    <>
      <main className="mx-auto max-w-4xl px-5 py-6">
      <header className="mb-8 flex items-center"><Link href={`/${slug}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden="true" />Voltar para {storeName}</Link></header>
      <div className="grid gap-10 md:grid-cols-2 md:items-start">
        <div className="flex flex-col gap-3">
          <div className="relative aspect-square overflow-hidden rounded-[10px] bg-tile">{selectedImage ? <img src={selectedImage} alt={product.name} className="size-full object-cover" /> : <ImageIcon className="absolute inset-0 m-auto size-10 text-muted-foreground" aria-hidden="true" />}</div>
          {productImages.length > 1 && <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Galeria de imagens do produto">{productImages.map((image, index) => <button key={`${image}-${index}`} type="button" onClick={() => setSelectedImage(image)} aria-label={`Ver imagem ${index + 1} de ${productImages.length}`} aria-pressed={selectedImage === image} className={`size-16 shrink-0 overflow-hidden rounded-[10px] border-2 ${selectedImage === image ? 'border-primary' : 'border-transparent'}`}><img src={image} alt="" className="size-full object-cover" /></button>)}</div>}
        </div>
        <div className="flex flex-col gap-6"><div><p className="mb-2 text-sm text-muted-foreground">{storeName}</p><h1 className="text-4xl font-semibold">{product.name}</h1>{canUseProductIdentifiers && (product.referenceCode || product.sku) && <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{product.referenceCode && <>REF {product.referenceCode}</>}{product.referenceCode && product.sku && <span className="px-2">·</span>}{product.sku && <>SKU {product.sku}</>}</p>}{product.priceOnRequest ? <p className="mt-3 text-xl font-semibold">Sob consulta</p> : <div className="mt-3 flex flex-col items-start gap-0.5">{product.offerPrice !== null && <span className="text-sm text-muted-foreground line-through">{formatBRL(product.price)}</span>}<p className="text-2xl font-semibold">{formatBRL(product.offerPrice ?? product.price)}</p></div>}{product.description && <p className="mt-4 leading-relaxed text-muted-foreground">{product.description}</p>}<p className="mt-4 text-sm font-medium">{product.stockStatus === 'in_stock' ? product.stockQuantity === null ? 'Em estoque' : `${product.stockQuantity} unidades em estoque` : product.stockStatus === 'made_to_order' ? 'Sob encomenda' : 'Fora de estoque'}</p></div>
          <div className="flex flex-col gap-5">{product.variations.map((variation) => <VariationSelector key={variation.id} variation={variation} value={selected[variation.id]} onChange={(optionId) => setSelected((state) => ({ ...state, [variation.id]: optionId }))} />)}</div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium">Quantidade</span>
            <div className="flex items-center gap-2 rounded-full bg-muted p-1">
              <button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))} aria-label="Diminuir quantidade" className="flex size-9 items-center justify-center rounded-full hover:bg-background"><Minus className="size-4" aria-hidden="true" /></button>
              <Input type="number" min={1} max={99} value={quantity} onChange={(event) => setQuantity(Math.min(99, Math.max(1, Number(event.target.value) || 1)))} aria-label="Quantidade" className="h-9 w-14 bg-background px-2 text-center" />
              <button type="button" onClick={() => setQuantity((current) => Math.min(99, current + 1))} aria-label="Aumentar quantidade" className="flex size-9 items-center justify-center rounded-full hover:bg-background"><Plus className="size-4" aria-hidden="true" /></button>
            </div>
          </div>
          <button type="button" disabled={!canAddToCart} onClick={addToCart} className="flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-6 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"><Check className="size-4" aria-hidden="true" />Adicionar ao carrinho</button>
        </div>
      </div>
      </main>
      {count > 0 && !cartOpen && (
        <div className="pb-safe pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="pointer-events-auto flex h-14 w-full max-w-md items-center justify-between rounded-full bg-primary pr-6 pl-2 text-primary-foreground shadow-xl shadow-foreground/20"
          >
            <span className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary-foreground/15 text-sm font-semibold">{count}</span>
              <span className="text-sm font-medium">Ver carrinho</span>
            </span>
            <span className="font-display text-base font-semibold">{formatBRL(total)}</span>
          </button>
        </div>
      )}
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} slug={slug} storeName={storeName} canReceiveOrders={canReceiveOrders} themeStyle={themeStyle} />
    </>
  )
}

function VariationSelector({ variation, value, onChange }: { variation: StorefrontVariation; value: string; onChange: (value: string) => void }) {
  return <fieldset className="flex flex-col gap-3"><legend className="text-sm font-semibold">{variation.name}</legend><div className="flex flex-wrap gap-2">{variation.options.map((option) => <button key={option.id} type="button" onClick={() => onChange(option.id)} aria-pressed={value === option.id} className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm transition-colors ${value === option.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted hover:bg-accent'}`}>{variation.selectorType === 'color' && option.colorValue ? <i className="size-3.5 rounded-full border border-background/40" style={{ backgroundColor: option.colorValue }} /> : null}{variation.selectorType === 'image' && option.imageUrl ? <img src={option.imageUrl} alt="" className="size-5 rounded-full object-cover" /> : null}{variation.selectorType === 'image' && option.imageUrl ? null : option.label}</button>)}</div></fieldset>
}
