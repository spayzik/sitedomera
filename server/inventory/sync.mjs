import { randomUUID } from 'node:crypto'
import { dirname, basename, join } from 'node:path'
import { open, rename, rm } from 'node:fs/promises'
import { InventoryError, isUuid, linkedId, selectStore } from './moysklad.mjs'
import { isStockQuantity, parseInventory } from '../../src/lib/inventory.ts'
import { candidateDetails, candidateReason, checkedSpecs, skuKey } from './reconcile.mjs'

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

function matchCatalog(products, assortment, units, manual, sources) {
  if (!manual || typeof manual !== 'object' || Array.isArray(manual)) throw new InventoryError('INVALID_MAPPING')
  const siteIds = new Set(products.map(p => p.id))
  for (const [id, entry] of Object.entries(manual)) {
    if (!siteIds.has(id)) throw new InventoryError('INVALID_MAPPING')
    if (entry === null) continue
    const identity = isUuid(entry?.id) && !Object.hasOwn(entry, 'externalCode') ||
      typeof entry?.externalCode === 'string' && entry.externalCode.length > 0 &&
      entry.externalCode === entry.externalCode.trim() && !Object.hasOwn(entry, 'id')
    if (!identity || !['product', 'variant'].includes(entry?.type) ||
        Object.keys(entry).some(key => !['id', 'externalCode', 'type', 'singleSheetName'].includes(key)) ||
        (Object.hasOwn(entry, 'singleSheetName') && (entry.type !== 'product' ||
          typeof entry.singleSheetName !== 'string' || !entry.singleSheetName.trim()))) {
      throw new InventoryError('INVALID_MAPPING')
    }
  }
  const active = assortment.filter(row => !row.archived)
  const byId = new Map(active.map(row => [row.id, row]))
  const byExternalId = indexBy(active, row => row.externalCode)
  const bySku = indexBy(active, row => skuKey(row.article))
  const siteSkus = indexBy(products, row => skuKey(row.sku))
  const parents = indexBy(active.filter(row => row.meta.type === 'product'), row => linkedId(row, 'product'))
  const variants = indexBy(active.filter(row => row.meta.type === 'variant'), row => linkedId(row.product, 'product'))
  const byUnit = new Map(units.filter(unit => !unit.archived).map(unit => [unit.id, unit.name]))
  const records = new Map(assortment.map(row => [row.id, { row, source: 'assortment' }]))
  for (const [source, rows] of Object.entries(sources)) {
    for (const row of rows) {
      if (!records.has(row.id)) records.set(row.id, { row, source })
    }
  }
  const visibleRecords = [...records.values()]
  const potential = products.map(product => {
    const approved = Object.hasOwn(manual, product.id) ? manual[product.id] : undefined
    const sku = skuKey(product.sku)
    const candidates = sku ? bySku.get(sku) ?? [] : []
    const details = candidateDetails(product, visibleRecords, approved)
    if (approved === null) return { product, candidates: details, reason: 'conflicting_identity' }
    const externalMatches = approved?.externalCode ? byExternalId.get(approved.externalCode) ?? [] : []
    const fallback = !approved && !product.skuReview
    const ambiguous = externalMatches.length > 1 ||
      (fallback && ((siteSkus.get(sku)?.length ?? 0) > 1 || candidates.length > 1))
    const entity = approved?.id ? byId.get(approved.id.toLowerCase())
      : approved?.externalCode && !ambiguous ? externalMatches[0] : fallback && !ambiguous ? candidates[0] : undefined
    const entry = { product, candidates: details }
    if (!entity || (approved && entity.meta.type !== approved.type) || !['product', 'variant'].includes(entity.meta.type)) {
      const reason = ambiguous ? 'ambiguous' : approved ? 'approved_entity_unavailable'
        : product.skuReview ? 'catalog_sku_review' : entity ? 'unsupported_entity_type' : candidateReason(sku, details)
      return { ...entry, reason }
    }
    const type = entity.meta.type
    if (type === 'product' && (entity.variantsCount > 0 || variants.has(linkedId(entity, 'product')))) {
      return { ...entry, reason: 'parent_with_variants' }
    }
    const parentRows = type === 'variant' ? parents.get(linkedId(entity.product, 'product')) ?? [] : [entity]
    const specProblem = checkedSpecs(product, entity, type === 'variant' ? parentRows[0] : undefined, approved)
    if (specProblem) return { ...entry, reason: specProblem }
    const unitName = parentRows.length === 1 ? byUnit.get(linkedId(parentRows[0].uom, 'uom')) : undefined
    const unit = catalogUnit(unitName)
    // A reviewed individual panel can be counted as one sheet while the exact CRM card still matches.
    const reviewedSheet = approved?.singleSheetName !== undefined && approved.singleSheetName === entity.name &&
      product.kind === 'panel' && product.unit === 'лист' && unit === 'шт' && sku && skuKey(entity.article) === sku &&
      (entity.packs == null || (Array.isArray(entity.packs) && entity.packs.length === 0))
    if (approved?.singleSheetName ? !reviewedSheet : unit !== product.unit) {
      return { ...entry, reason: 'unit_unverified', unitName }
    }
    return { ...entry, entity, via: approved?.id ? 'uuid' : approved?.externalCode ? 'externalCode' : 'article', unitName }
  })
  const claims = indexBy(potential, entry => entry.entity?.id)
  return potential.map(entry => {
    const group = claims.get(entry.entity?.id)
    if (!group || group.length === 1) return entry
    const explicitUuid = group.filter(claim => claim.via === 'uuid')
    const approved = explicitUuid.length ? explicitUuid : group.filter(claim => claim.via === 'externalCode')
    return approved.length === 1 && approved[0] === entry ? entry
      : { product: entry.product, candidates: entry.candidates, reason: 'ambiguous', unitName: entry.unitName }
  })
}

export async function importInventory({ reader, products, storeId, manual = {}, now = Date.now, reconcile = false }) {
  const stores = await reader.stores()
  const { store, addressVerified } = selectStore(stores, storeId)
  const assortment = await reader.assortment()
  const units = await reader.units()
  const sources = reconcile ? await reader.reconciliationSources() : {}
  const assortmentIds = new Set(assortment.map(row => row.id))
  const sourceCounts = Object.fromEntries(Object.entries(sources).map(([key, rows]) => [key, rows.length]))
  if (reconcile) {
    sourceCounts.productsMissingFromAssortment = sources.activeProducts.filter(row => !assortmentIds.has(row.id)).length
    sourceCounts.variantsMissingFromAssortment = sources.activeVariants.filter(row => !assortmentIds.has(row.id)).length
  }
  const mapping = matchCatalog(products, assortment, units, manual, sources)
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
    entries: mapping.map(({ product, entity, via, reason, unitName, candidates }, index) => ({
      productId: product.id, sku: product.sku, category: product.categoryId, dimensions: product.dimensions,
      thicknessMm: product.thicknessMm, unit: product.unit,
      crmId: entity?.id, crmSku: entity?.article, crmType: entity?.meta.type, crmUnit: unitName,
      candidateCount: new Set(candidates.map(candidate => candidate.id)).size,
      candidates, via, reason, quantity: items[index].quantity,
      stockStatus: !entity ? 'not_mapped' : !stocks.has(entity.id) ? 'missing_row'
        : stocks.get(entity.id) === null ? 'recalculating' : items[index].reason ? 'invalid_quantity' : 'verified',
      stockReason: items[index].reason,
    })),
  }
  return {
    snapshot, manifest,
    summary: {
      visibleStores: stores.length, storeId: store.id, addressVerified,
      assortmentSize: assortment.length, stockReportRead: ids.length > 0,
      ...(reconcile ? { sources: sourceCounts, catalog: {
        products: products.length, withSku: products.filter(product => skuKey(product.sku)).length,
        reasons: Object.fromEntries([...indexBy(mapping, entry => entry.reason)].map(([reason, entries]) => [reason, entries.length])),
      } } : {}),
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

export async function atomicWrite(path, json, mode) {
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
