import { randomUUID } from 'node:crypto'
import { dirname, basename, join } from 'node:path'
import { open, rename, rm } from 'node:fs/promises'
import { InventoryError, isUuid, linkedId, selectStore } from './moysklad.mjs'
import { isStockQuantity, parseInventory } from '../../src/lib/inventory.ts'

const skuKey = value => typeof value === 'string' ? value.trim().normalize('NFC').toUpperCase() : ''
const unitKey = value => typeof value === 'string' ? value.trim().toLowerCase().replace(/\.$/, '') : ''
const catalogUnit = value => ['шт', 'штука', 'штук'].includes(unitKey(value)) ? 'шт'
  : ['лист', 'листы', 'листов'].includes(unitKey(value)) ? 'лист' : undefined

function indexBy(items, key) {
  const index = new Map()
  for (const item of items) {
    const value = key(item)
    if (!value) continue
    const group = index.get(value) ?? []
    group.push(item)
    index.set(value, group)
  }
  return index
}

function matchCatalog(products, assortment, units, manual) {
  if (!manual || typeof manual !== 'object' || Array.isArray(manual)) throw new InventoryError('INVALID_MAPPING')
  const siteIds = new Set(products.map(p => p.id))
  for (const [id, entry] of Object.entries(manual)) {
    if (!siteIds.has(id) || Object.keys(entry ?? {}).length !== 2 || !isUuid(entry?.id) ||
        !['product', 'variant'].includes(entry?.type)) throw new InventoryError('INVALID_MAPPING')
  }
  const active = assortment.filter(row => !row.archived)
  const byId = new Map(active.map(row => [row.id, row]))
  const bySku = indexBy(active, row => skuKey(row.article))
  const siteSkus = indexBy(products, row => skuKey(row.sku))
  const parents = indexBy(active.filter(row => row.meta.type === 'product'), row => linkedId(row, 'product'))
  const variants = indexBy(active.filter(row => row.meta.type === 'variant'), row => linkedId(row.product, 'product'))
  const byUnit = new Map(units.filter(unit => !unit.archived).map(unit => [unit.id, unit.name]))
  const potential = products.map(product => {
    const approved = Object.hasOwn(manual, product.id) ? manual[product.id] : undefined
    const sku = skuKey(product.sku)
    const candidates = sku ? bySku.get(sku) ?? [] : []
    const fallback = !approved && !product.skuReview
    const ambiguous = fallback && ((siteSkus.get(sku)?.length ?? 0) > 1 || candidates.length > 1)
    const entity = approved ? byId.get(approved.id.toLowerCase()) : fallback && !ambiguous ? candidates[0] : undefined
    if (!entity || (approved && entity.meta.type !== approved.type) || !['product', 'variant'].includes(entity.meta.type)) {
      return { product, reason: ambiguous ? 'ambiguous' : 'unmapped' }
    }
    const type = entity.meta.type
    if (type === 'product' && (entity.variantsCount > 0 || variants.has(linkedId(entity, 'product')))) {
      return { product, reason: 'unmapped' }
    }
    const parentRows = type === 'variant' ? parents.get(linkedId(entity.product, 'product')) ?? [] : [entity]
    const unitName = parentRows.length === 1 ? byUnit.get(linkedId(parentRows[0].uom, 'uom')) : undefined
    if (catalogUnit(unitName) !== product.unit) {
      return { product, reason: 'unit_unverified', unitName }
    }
    return { product, entity, via: approved ? 'uuid' : 'article', unitName }
  })
  const claims = indexBy(potential, entry => entry.entity?.id)
  return potential.map(entry => {
    const group = claims.get(entry.entity?.id)
    if (!group || group.length === 1) return entry
    const approved = group.filter(claim => claim.via === 'uuid')
    return approved.length === 1 && approved[0] === entry ? entry
      : { product: entry.product, reason: 'ambiguous', unitName: entry.unitName }
  })
}

export async function importInventory({ reader, products, storeId, manual = {}, now = Date.now }) {
  const stores = await reader.stores()
  const { store, addressVerified } = selectStore(stores, storeId)
  const assortment = await reader.assortment()
  const units = await reader.units()
  const mapping = matchCatalog(products, assortment, units, manual)
  const ids = mapping.flatMap(entry => entry.entity ? [entry.entity.id] : [])
  const updatedAt = new Date(now()).toISOString()
  const stocks = ids.length ? await reader.stock(store.id, ids) : new Map()
  const items = mapping.map(({ product, entity, reason }) => {
    const id = product.id
    if (!entity) return { id, reason: reason === 'unit_unverified' ? 'invalid_data' : 'unmapped' }
    const quantity = stocks.get(entity.id)
    return isStockQuantity(quantity) ? { id, unit: product.unit, quantity } : { id, reason: 'invalid_data' }
  })
  const snapshot = { version: 1, source: 'moysklad', updatedAt, items }
  parseInventory(snapshot, products, now())
  const manifest = {
    storeId: store.id, updatedAt,
    entries: mapping.map(({ product, entity, via, reason, unitName }, index) => ({
      productId: product.id, crmId: entity?.id, crmType: entity?.meta.type, via, reason, unit: product.unit,
      crmUnit: unitName, quantity: items[index].quantity, stockReason: items[index].reason,
    })),
  }
  return {
    snapshot, manifest,
    summary: {
      visibleStores: stores.length, storeId: store.id, addressVerified,
      assortmentSize: assortment.length, stockReportRead: ids.length > 0,
      mapping: {
        matched: ids.length,
        unmatched: mapping.filter(e => !e.entity && e.reason !== 'ambiguous').length,
        ambiguous: mapping.filter(e => e.reason === 'ambiguous').length,
      },
      unitUnverified: mapping.filter(e => e.reason === 'unit_unverified').length,
      unitKinds: [...new Set(mapping.flatMap(e => e.unitName ? [catalogUnit(e.unitName) ?? 'other'] : []))].sort(),
      verifiedRows: items.filter(e => 'quantity' in e).length,
    },
  }
}

async function atomicWrite(path, json, mode) {
  const temp = join(dirname(path), '.' + basename(path) + '.' + randomUUID() + '.tmp')
  const file = await open(temp, 'wx', mode)
  try {
    try {
      await file.writeFile(JSON.stringify(json) + '\n')
      await file.sync()
    } finally {
      await file.close()
    }
    await rename(temp, path)
  } finally {
    await rm(temp, { force: true })
  }
}

export async function publishSnapshot(path, snapshot, products, now = Date.now()) {
  const validated = parseInventory(snapshot, products, now)
  if (validated.expiresAt <= now) throw new InventoryError('STALE_SNAPSHOT')
  await atomicWrite(path, snapshot, 0o644)
}

export async function savePrivateManifest(path, manifest) {
  await atomicWrite(path, manifest, 0o600)
}
