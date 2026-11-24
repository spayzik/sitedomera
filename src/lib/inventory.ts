import type { Product } from '../data/catalogModel.ts'

type StockProduct = Pick<Product, 'id' | 'unit'>
type StockUnit = StockProduct['unit']
type Entry =
  | { id: string; unit: StockUnit; quantity: number }
  | { id: string; reason: 'unmapped' | 'invalid_data' }

export type StockAvailability =
  | { status: 'in_stock'; quantity: number; unit: StockUnit; updatedAt: string }
  | { status: 'out_of_stock'; quantity: 0; unit: StockUnit; updatedAt: string }
  | { status: 'unknown'; reason: 'unmapped' | 'stale' | 'api_unavailable' | 'invalid_data' }

export interface InventorySnapshot {
  version: 1
  source: 'moysklad'
  updatedAt: string
  items: Entry[]
}

export interface Inventory {
  updatedAt: string
  expiresAt: number
  items: ReadonlyMap<string, Entry>
}

export type CommerceAvailability = { updatedAt: string; saleable: ReadonlySet<string> }

export function parseCommerceAvailability(value: unknown, catalog: readonly StockProduct[]): CommerceAvailability | null {
  if (value === null) return null
  const productIds = new Set(catalog.map(({ id }) => id))
  if (!record(value) || Object.keys(value).length !== 2 || typeof value.updatedAt !== 'string' ||
      !Array.isArray(value.saleable) || value.saleable.length > productIds.size ||
      !value.saleable.every(id => typeof id === 'string' && productIds.has(id)) ||
      new Set(value.saleable).size !== value.saleable.length) throw new Error('Invalid commerce status')
  return { updatedAt: value.updatedAt, saleable: new Set(value.saleable) }
}

export function offerAvailability(stock: StockAvailability, productId: string, commerce: CommerceAvailability | null) {
  if (stock.status === 'out_of_stock') return 'OutOfStock'
  if (stock.status === 'in_stock' && stock.quantity >= 1 && stock.updatedAt === commerce?.updatedAt && commerce.saleable.has(productId)) return 'InStock'
  return undefined
}

export const STOCK_MAX_AGE_MS = 45 * 60_000
const MAX_CLOCK_SKEW_MS = 2 * 60_000

export function stagingInventoryUrl(value: string | undefined, productionHostname: string): string | null {
  if (!value) return null
  try {
    const endpoint = new URL(value)
    const hostname = endpoint.hostname.replace(/\.$/, '')
    if (endpoint.protocol !== 'https:' || endpoint.pathname !== '/generated/inventory.json' ||
        endpoint.username || endpoint.password || endpoint.search || endpoint.hash ||
        hostname === productionHostname || hostname.endsWith('.' + productionHostname)) return null
    return endpoint.href
  } catch {
    return null
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function isStockQuantity(quantity: unknown): quantity is number {
  return typeof quantity === 'number' && Number.isFinite(quantity) && quantity >= 0 && quantity <= Number.MAX_SAFE_INTEGER
}

export function parseInventory(raw: unknown, catalog: readonly StockProduct[], now = Date.now()): Inventory {
  if (!record(raw) || Object.keys(raw).length !== 4 || raw.version !== 1 || raw.source !== 'moysklad' ||
      typeof raw.updatedAt !== 'string' || !Array.isArray(raw.items) || raw.items.length !== catalog.length) {
    throw new Error('Invalid inventory snapshot')
  }
  const updated = Date.parse(raw.updatedAt)
  if (!Number.isFinite(updated) || new Date(updated).toISOString() !== raw.updatedAt || updated > now + MAX_CLOCK_SKEW_MS) {
    throw new Error('Invalid inventory timestamp')
  }
  const units = new Map(catalog.map(p => [p.id, p.unit]))
  const items = new Map<string, Entry>()
  for (const entry of raw.items) {
    if (!record(entry) || typeof entry.id !== 'string' || items.has(entry.id)) throw new Error('Invalid inventory item')
    const unit = units.get(entry.id)
    if (!unit) throw new Error('Unexpected inventory item')
    if (Object.keys(entry).length === 2 && (entry.reason === 'unmapped' || entry.reason === 'invalid_data')) {
      items.set(entry.id, { id: entry.id, reason: entry.reason })
    } else if (Object.keys(entry).length === 3 && entry.unit === unit && isStockQuantity(entry.quantity)) {
      items.set(entry.id, { id: entry.id, unit, quantity: entry.quantity })
    } else {
      throw new Error('Invalid inventory quantity or unit')
    }
  }
  return { updatedAt: raw.updatedAt, expiresAt: updated + STOCK_MAX_AGE_MS, items }
}

export function availabilityFor(inventory: Inventory | null, id: string, now = Date.now(),
  unavailable: 'api_unavailable' | 'invalid_data' = 'api_unavailable'): StockAvailability {
  if (!inventory) return { status: 'unknown', reason: unavailable }
  if (now >= inventory.expiresAt) return { status: 'unknown', reason: 'stale' }
  const item = inventory.items.get(id)
  if (!item) return { status: 'unknown', reason: 'unmapped' }
  if ('reason' in item) return { status: 'unknown', reason: item.reason }
  const { unit, quantity } = item
  const updatedAt = inventory.updatedAt
  return quantity === 0 ? { status: 'out_of_stock', quantity: 0, unit, updatedAt }
    : { status: 'in_stock', quantity, unit, updatedAt }
}

const amount = new Intl.NumberFormat('ru-RU', { maximumSignificantDigits: 21 })
const plural = new Intl.PluralRules('ru-RU')

export function stockLabel(stock: StockAvailability): string {
  if (stock.status === 'unknown') return 'Наличие уточняется'
  if (stock.status === 'out_of_stock') return 'Нет в наличии'
  const form = plural.select(stock.quantity)
  const suffix = stock.unit === 'шт' ? 'шт.' : form === 'one' ? 'лист' : form === 'many' ? 'листов' : 'листа'
  return 'В наличии на складе в Москве · ' + amount.format(stock.quantity) + ' ' + suffix
}
