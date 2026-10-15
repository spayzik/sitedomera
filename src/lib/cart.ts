import { legacyCartIds, products } from '../data/products.ts'
import type { Product } from '../data/products.ts'

export interface CartItem { product: Product; qty: number }
export const MAX_QTY = 9999
export const retiredCartIds = [
  '919-4', '8548', '2312-309', '8891-5', '8163-11Y73', '8892-2', '921-1',
  'elka-seraya', 'elka-temnaya', '962-1', '002-A229', '013-A229', '006-2',
  '001-A261', 'JGFG-022', '002-A235', 'M3201-254', 'ryab-3d', 'slat-plaster',
] as const
const retired = new Set<string>(retiredCartIds)

// Browser storage contains IDs and quantities only. Never accept cached Product objects/prices.
export function migrateCart(raw: unknown, currentProducts: readonly Product[] = products): { items: CartItem[]; retiredIds: string[] } {
  if (!Array.isArray(raw) || raw.length > 128) return { items: [], retiredIds: [] }
  const byId = new Map(currentProducts.map(p => [p.id, p]))
  const result: CartItem[] = []
  const seen = new Set<string>()
  const removed = new Set<string>()
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || Object.keys(entry).length !== 2 ||
      typeof entry.id !== 'string' || !Number.isSafeInteger(entry.qty) || entry.qty < 1 || entry.qty > MAX_QTY) continue
    const id = legacyCartIds[entry.id] ?? entry.id
    const product = byId.get(id)
    if (!product && retired.has(entry.id)) removed.add(entry.id)
    if (!product || seen.has(id)) continue
    result.push({ product, qty: entry.qty })
    seen.add(id)
  }
  return { items: result, retiredIds: [...removed] }
}

export const restoreCart = (raw: unknown, currentProducts: readonly Product[] = products) => migrateCart(raw, currentProducts).items
export function loadCartState(raw: unknown, pendingNotice: boolean) {
  const { items, retiredIds } = migrateCart(raw)
  return { items, migrationNotice: pendingNotice || retiredIds.length > 0 }
}

export const cartTotal = (items: readonly CartItem[]) => items.reduce((sum, x) => sum + x.product.priceRub * x.qty, 0)
export const cartSnapshot = (items: readonly CartItem[]) => items.map(x => ({ id: x.product.id, qty: x.qty }))
