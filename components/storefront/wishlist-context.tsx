'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type WishlistItem = {
  productId: string
  name: string
  price: number
  imageUrl: string | null
}

type WishlistContextValue = {
  items: WishlistItem[]
  count: number
  has: (productId: string) => boolean
  toggle: (item: WishlistItem) => void
  remove: (productId: string) => void
}

const WishlistContext = createContext<WishlistContextValue | null>(null)

function key(slug: string) {
  return `ui-sales-wishlist:${slug}`
}

export function WishlistProvider({ storeSlug, children }: { storeSlug: string; children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(key(storeSlug))
      if (saved) {
        const parsed = JSON.parse(saved) as WishlistItem[]
        if (Array.isArray(parsed)) setItems(parsed)
      }
    } catch {
      sessionStorage.removeItem(key(storeSlug))
    } finally {
      setHydrated(true)
    }
  }, [storeSlug])

  useEffect(() => {
    if (hydrated) sessionStorage.setItem(key(storeSlug), JSON.stringify(items))
  }, [hydrated, items, storeSlug])

  const has = useCallback((productId: string) => items.some((item) => item.productId === productId), [items])
  const toggle = useCallback((item: WishlistItem) => {
    setItems((current) => current.some((entry) => entry.productId === item.productId)
      ? current.filter((entry) => entry.productId !== item.productId)
      : [...current, item])
  }, [])
  const remove = useCallback((productId: string) => setItems((current) => current.filter((item) => item.productId !== productId)), [])

  const value = useMemo(() => ({ items, count: items.length, has, toggle, remove }), [items, has, toggle, remove])
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (!context) throw new Error('useWishlist deve ser usado dentro de WishlistProvider')
  return context
}
