import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { products } from '../data/products'
import type { Product } from '../data/products'

export interface CartItem {
  product: Product
  qty: number
}

interface CartCtx {
  items: CartItem[]
  count: number
  total: number
  add: (p: Product, qty?: number) => void
  remove: (id: string) => void
  setQty: (id: string, qty: number) => void
  clear: () => void
  open: boolean
  setOpen: (v: boolean) => void
}

const Ctx = createContext<CartCtx | null>(null)

const STORAGE_KEY = 'domera-cart-v1'

const byId = new Map(products.map((p) => [p.id, p]))

function loadStored(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const restored: CartItem[] = []
    for (const entry of parsed) {
      if (
        entry &&
        typeof entry === 'object' &&
        typeof (entry as { id?: unknown }).id === 'string' &&
        typeof (entry as { qty?: unknown }).qty === 'number' &&
        (entry as { qty: number }).qty > 0
      ) {
        const p = byId.get((entry as { id: string }).id)
        if (p) restored.push({ product: p, qty: (entry as { qty: number }).qty })
      }
    }
    return restored
  } catch {
    return []
  }
}

function persist(items: CartItem[]) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(items.map((x) => ({ id: x.product.id, qty: x.qty }))),
    )
  } catch {
    /* приватный режим / переполнение — молча игнорируем */
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadStored)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    persist(items)
  }, [items])

  const api = useMemo<CartCtx>(() => {
    const add = (p: Product, qty = 1) => {
      setItems((prev) => {
        const i = prev.findIndex((x) => x.product.id === p.id)
        if (i >= 0) {
          const next = [...prev]
          next[i] = { ...next[i], qty: next[i].qty + qty }
          return next
        }
        return [...prev, { product: p, qty }]
      })
      setOpen(true)
    }
    const remove = (id: string) =>
      setItems((prev) => prev.filter((x) => x.product.id !== id))
    const setQty = (id: string, qty: number) =>
      setItems((prev) =>
        prev
          .map((x) => (x.product.id === id ? { ...x, qty } : x))
          .filter((x) => x.qty > 0),
      )
    const clear = () => setItems([])
    const count = items.reduce((s, x) => s + x.qty, 0)
    const total = items.reduce((s, x) => s + x.qty * x.product.price, 0)
    return { items, count, total, add, remove, setQty, clear, open, setOpen }
  }, [items, open])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useCart() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useCart outside provider')
  return v
}
