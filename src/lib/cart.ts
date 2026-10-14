import { legacyCartIds, products } from '../data/products.ts'
import type { Product } from '../data/products.ts'

export interface CartItem { product: Product; qty: number }
export const MAX_QTY = 9999

// Browser storage contains IDs and quantities only. Never accept cached Product objects/prices.
export function restoreCart(raw: unknown, currentProducts: readonly Product[] = products): CartItem[] {
  if (!Array.isArray(raw) || raw.length > 128) return []
  const byId = new Map(currentProducts.map(p => [p.id, p]))
  const result: CartItem[] = []
  const seen = new Set<string>()
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || Object.keys(entry).length !== 2 ||
      typeof entry.id !== 'string' || !Number.isSafeInteger(entry.qty) || entry.qty < 1 || entry.qty > MAX_QTY) continue
    const id = legacyCartIds[entry.id] ?? entry.id
    const product = byId.get(id)
    if (!product || seen.has(id)) continue
    result.push({ product, qty: entry.qty })
    seen.add(id)
  }
  return result
}

export const cartTotal = (items: readonly CartItem[]) => items.reduce((sum, x) => sum + x.product.priceRub * x.qty, 0)
export const cartSnapshot = (items: readonly CartItem[]) => items.map(x => ({ id: x.product.id, qty: x.qty }))
