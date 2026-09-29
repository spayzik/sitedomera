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
const MAX_QTY = 9999

const byId = new Map(products.map((p) => [p.id, p]))

function loadStored(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length > byId.size) return []
    const restored: CartItem[] = []
    const seen = new Set<string>()
    for (const entry of parsed) {
      if (
        entry &&
        typeof entry === 'object' &&
        !Array.isArray(entry) &&
        Object.keys(entry).length === 2 &&
        typeof (entry as { id?: unknown }).id === 'string' &&
        Number.isSafeInteger((entry as { qty?: unknown }).qty) &&
        (entry as { qty: number }).qty > 0 &&
        (entry as { qty: number }).qty <= MAX_QTY
      ) {
        const id = (entry as { id: string }).id
        const p = byId.get(id)
        if (p && !seen.has(id)) {
          restored.push({ product: p, qty: (entry as { qty: number }).qty })
          seen.add(id)
        }
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
      const product = byId.get(p.id)
      if (!product || !Number.isSafeInteger(qty) || qty < 1) return
      setItems((prev) => {
        const i = prev.findIndex((x) => x.product.id === product.id)
        if (i >= 0) {
          const next = [...prev]
          next[i] = { ...next[i], qty: Math.min(MAX_QTY, next[i].qty + qty) }
          return next
        }
        return [...prev, { product, qty: Math.min(MAX_QTY, qty) }]
      })
      setOpen(true)
    }
    const remove = (id: string) =>
      setItems((prev) => prev.filter((x) => x.product.id !== id))
    const setQty = (id: string, qty: number) => {
      if (!Number.isSafeInteger(qty)) return
      const boundedQty = Math.max(0, Math.min(MAX_QTY, qty))
      setItems((prev) =>
        prev
          .map((x) => (x.product.id === id ? { ...x, qty: boundedQty } : x))
          .filter((x) => x.qty > 0),
      )
    }
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
