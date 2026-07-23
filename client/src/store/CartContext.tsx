/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Product } from '../types/api'

export interface CartItem {
  product: Product
  quantity: number
}

interface CartState {
  items: CartItem[]
  count: number
  add: (product: Product) => void
  update: (productId: string, quantity: number) => void
  remove: (productId: string) => void
  clear: () => void
}

const key = 'raco_cart'
const CartContext = createContext<CartState | null>(null)

function initialCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as CartItem[]
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(initialCart)
  const save = (next: CartItem[]) => {
    setItems(next)
    localStorage.setItem(key, JSON.stringify(next))
  }
  const value = useMemo<CartState>(
    () => ({
      items,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      add: (product) => {
        const existing = items.find((item) => item.product.id === product.id)
        save(
          existing
            ? items.map((item) =>
                item.product.id === product.id
                  ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
                  : item,
              )
            : [...items, { product, quantity: 1 }],
        )
      },
      update: (productId, quantity) =>
        save(
          items.map((item) =>
            item.product.id === productId
              ? { ...item, quantity: Math.max(1, Math.min(quantity, item.product.stock)) }
              : item,
          ),
        ),
      remove: (productId) => save(items.filter((item) => item.product.id !== productId)),
      clear: () => save([]),
    }),
    [items],
  )
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartState {
  const value = useContext(CartContext)
  if (!value) throw new Error('useCart must be used within CartProvider')
  return value
}
