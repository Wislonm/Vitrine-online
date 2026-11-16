'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'

export type CartItem = {
  productId: string
  name: string
  price: number
  imageUrl: string | null
  quantity: number
  variationSelections: { variationId: string; variationName: string; optionId: string; optionLabel: string }[]
}

export function getCartItemKey(item: Pick<CartItem, 'productId' | 'variationSelections'>) {
  const options = item.variationSelections.map((selection) => `${selection.variationId}:${selection.optionId}`).sort().join('|')
  return `${item.productId}::${options}`
}

type CartAction =
  | { type: 'add'; item: Omit<CartItem, 'quantity'> }
  | { type: 'increase'; itemKey: string }
  | { type: 'decrease'; itemKey: string }
  | { type: 'remove'; itemKey: string }
  | { type: 'clear' }

const MAX_QUANTITY = 99

function reducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'add': {
      const existing = state.find((item) => getCartItemKey(item) === getCartItemKey(action.item))
      if (existing) {
        return state.map((item) =>
          getCartItemKey(item) === getCartItemKey(existing)
            ? { ...item, quantity: Math.min(item.quantity + 1, MAX_QUANTITY) }
            : item,
        )
      }
      return [...state, { ...action.item, quantity: 1 }]
    }
    case 'increase':
      return state.map((item) =>
        getCartItemKey(item) === action.itemKey
          ? { ...item, quantity: Math.min(item.quantity + 1, MAX_QUANTITY) }
          : item,
      )
    case 'decrease':
      return state.map((item) =>
        getCartItemKey(item) === action.itemKey
          ? { ...item, quantity: Math.max(item.quantity - 1, 1) }
          : item,
      )
    case 'remove':
      return state.filter((item) => getCartItemKey(item) !== action.itemKey)
    case 'clear':
      return []
  }
}

type CartContextValue = {
  items: CartItem[]
  count: number
  total: number
  add: (item: Omit<CartItem, 'quantity'>) => void
  increase: (itemKey: string) => void
  decrease: (itemKey: string) => void
  remove: (itemKey: string) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

function storageKey(storeSlug: string) {
  return `ui-sales-cart:${storeSlug}`
}

/** O carrinho é temporário por sessão e isolado por slug da loja. */
export function CartProvider({ children, storeSlug }: { children: ReactNode; storeSlug: string }) {
  const [items, dispatch] = useReducer(reducer, [])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey(storeSlug))
      if (saved) {
        const parsed = JSON.parse(saved) as CartItem[]
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item?.productId && Number.isFinite(item.quantity) && item.quantity > 0) {
              for (let index = 0; index < Math.min(item.quantity, MAX_QUANTITY); index += 1) {
                const { quantity: _savedQuantity, ...cartItem } = item
                dispatch({ type: 'add', item: cartItem })
              }
            }
          }
        }
      }
    } catch {
      sessionStorage.removeItem(storageKey(storeSlug))
    } finally {
      setHydrated(true)
    }
  }, [storeSlug])

  useEffect(() => {
    if (!hydrated) return
    try {
      sessionStorage.setItem(storageKey(storeSlug), JSON.stringify(items))
    } catch {
      // Storage can be unavailable in private browsing; the in-memory cart still works.
    }
  }, [hydrated, items, storeSlug])

  const add = useCallback((item: Omit<CartItem, 'quantity'>) => dispatch({ type: 'add', item }), [])
  const increase = useCallback((itemKey: string) => dispatch({ type: 'increase', itemKey }), [])
  const decrease = useCallback((itemKey: string) => dispatch({ type: 'decrease', itemKey }), [])
  const remove = useCallback((itemKey: string) => dispatch({ type: 'remove', itemKey }), [])
  const clear = useCallback(() => dispatch({ type: 'clear' }), [])

  const value = useMemo<CartContextValue>(() => {
    const totalCents = items.reduce((sum, item) => sum + Math.round(item.price * 100) * item.quantity, 0)
    return {
      items,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      total: totalCents / 100,
      add,
      increase,
      decrease,
      remove,
      clear,
    }
  }, [items, add, increase, decrease, remove, clear])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart deve ser usado dentro de CartProvider')
  return context
}
