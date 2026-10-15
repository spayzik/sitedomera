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
import { loadCartState, cartSnapshot, cartTotal, MAX_QTY } from '../lib/cart'
import type { CartItem } from '../lib/cart'
export type { CartItem } from '../lib/cart'

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
  migrationNotice: boolean
  dismissMigrationNotice: () => void
}

const Ctx = createContext<CartCtx | null>(null)

const STORAGE_KEY = 'domera-cart-v1'
const NOTICE_KEY = 'domera-cart-update-notice-v1'

const byId = new Map(products.map((p) => [p.id, p]))

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const pending = localStorage.getItem(NOTICE_KEY) === 'pending'
    try { return loadCartState(raw ? JSON.parse(raw) : [], pending) }
    catch { return loadCartState([], pending) }
  } catch { return loadCartState([], false) }
}

function persist(items: CartItem[]) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(cartSnapshot(items)),
    )
  } catch {
    /* приватный режим / переполнение — молча игнорируем */
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(loadStored)
  const [items, setItems] = useState<CartItem[]>(initial.items)
  const [migrationNotice, setMigrationNotice] = useState(initial.migrationNotice)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    persist(items)
    try {
      if (migrationNotice) localStorage.setItem(NOTICE_KEY, 'pending')
      else localStorage.removeItem(NOTICE_KEY)
    } catch { /* Storage unavailable: notice still works during this visit. */ }
  }, [items, migrationNotice])

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
    const total = cartTotal(items)
    return { items, count, total, add, remove, setQty, clear, open, setOpen, migrationNotice, dismissMigrationNotice: () => setMigrationNotice(false) }
  }, [items, open, migrationNotice])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useCart() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useCart outside provider')
  return v
}
