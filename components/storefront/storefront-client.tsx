'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import { PackageSearch, Search } from 'lucide-react'
import { CartProvider, useCart } from '@/components/storefront/cart-context'
import { WishlistProvider } from '@/components/storefront/wishlist-context'
import { CartSheet } from '@/components/storefront/cart-sheet'
import { ProductCard, type StorefrontProduct } from '@/components/storefront/product-card'
import { Input } from '@/components/ui/input'
import { formatBRL } from '@/lib/format'
import { cn } from '@/lib/utils'

type StorefrontProps = {
  slug: string
  storeName: string
  canReceiveOrders: boolean
  products: StorefrontProduct[]
  categories: { id: string; name: string }[]
  hero: React.ReactNode
  storeHeader: React.ReactNode
  footer: React.ReactNode
  themeStyle: CSSProperties
}

function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function StorefrontContent({ slug, storeName, canReceiveOrders, products, categories, hero, storeHeader, footer, themeStyle }: StorefrontProps) {
  const cart = useCart()
  const [cartOpen, setCartOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const term = normalize(query.trim())
    return products.filter((p) => {
      if (categoryId && p.categoryId !== categoryId) return false
      return term ? normalize(p.name).includes(term) : true
    })
  }, [products, query, categoryId])

  const hasFilters = query.trim().length > 0 || categoryId !== null

  return (
    <div className="storefront-page mx-auto flex min-h-dvh max-w-5xl flex-col overflow-x-hidden bg-background px-4 pb-28 sm:px-5" style={themeStyle}>
      {storeHeader}

      <main className="flex flex-col gap-6 px-0 pt-0 sm:px-0">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar produto"
              aria-label="Buscar produto pelo nome"
              className="pl-12"
            />
          </div>

          {hero}

          {categories.length > 0 && (
            <div role="group" aria-label="Filtrar por categoria" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              {[{ id: null as string | null, name: 'Todos' }, ...categories].map((category) => {
                const active = categoryId === category.id
                return (
                  <button
                    key={category.id ?? 'all'}
                    type="button"
                    onClick={() => setCategoryId(category.id)}
                    aria-pressed={active}
                    className={cn(
                      'h-11 shrink-0 cursor-pointer rounded-full px-5 text-sm font-medium transition-colors',
                      active ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent',
                    )}
                  >
                    {category.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[2rem] bg-muted px-6 py-20 text-center">
            <PackageSearch className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="font-display text-xl font-semibold">Em breve, novidades por aqui</p>
            <p className="max-w-sm text-sm text-muted-foreground">Esta vitrine ainda não tem produtos publicados.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div role="status" className="flex flex-col items-center gap-3 rounded-[2rem] bg-muted px-6 py-16 text-center">
            <PackageSearch className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="font-display text-xl font-semibold">Nenhum produto encontrado</p>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setCategoryId(null)
                }}
                className="cursor-pointer text-sm underline underline-offset-4"
              >
                Limpar busca e filtros
              </button>
            )}
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} slug={slug} />
            ))}
          </ul>
        )}
      </main>

      {footer}

      {cart.count > 0 && !cartOpen && (
        <div className="pb-safe pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="pointer-events-auto flex h-14 w-full max-w-md cursor-pointer items-center justify-between rounded-full bg-primary pr-6 pl-2 text-primary-foreground shadow-xl shadow-foreground/20 transition-transform active:scale-[0.98]"
          >
            <span className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary-foreground/15 text-sm font-semibold">
                {cart.count}
              </span>
              <span className="text-sm font-medium">Ver carrinho</span>
            </span>
            <span className="font-display text-base font-semibold">{formatBRL(cart.total)}</span>
          </button>
        </div>
      )}

      <CartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        slug={slug}
        storeName={storeName}
        canReceiveOrders={canReceiveOrders}
        themeStyle={themeStyle}
      />
    </div>
  )
}

export function StorefrontClient(props: StorefrontProps) {
  return (
    <WishlistProvider storeSlug={props.slug}>
      <CartProvider key={props.slug} storeSlug={props.slug}>
        <StorefrontContent {...props} />
      </CartProvider>
    </WishlistProvider>
  )
}
