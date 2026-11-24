import { setTimeout as delay } from 'node:timers/promises'

const API = 'https://api.moysklad.ru/api/remap/1.2/'
const COLLECTIONS = new Set(['entity/store', 'entity/assortment', 'entity/uom', 'entity/product', 'entity/variant'])
const RETRYABLE_HTTP = new Set([502, 503, 504])
export const STOCK_ENDPOINT = 'report/stock/bystore/current'
export const isUuid = value => typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)

export class InventoryError extends Error {
  constructor(code, details = {}) {
    super(code)
    this.details = details
  }
}

export function linkedId(link, type) {
  if (link?.meta?.type !== type || typeof link.meta.href !== 'string') return undefined
  const prefix = API + 'entity/' + type + '/'
  const id = link.meta.href.split('?')[0].slice(prefix.length)
  return link.meta.href.startsWith(prefix) && isUuid(id) ? id.toLowerCase() : undefined
}

function matchesAddress(store) {
  const full = store.addressFull
  const normalize = value => typeof value === 'string' ? value.toLowerCase().replace(/[.\s]/g, '') : ''
  const house = normalize(full?.house)
  if (normalize(full?.city).replace(/^г/, '') === 'москва' &&
      /^алтуфьевское(?:ш|шоссе)$/.test(normalize(full?.street)) && house === '37с1') return true
  return typeof store.address === 'string' && /(?:^|[,\s])москва(?:$|[,\s])/i.test(store.address) &&
    /алтуфьевское\s+ш(?:оссе|\.)?[\s,]+(?:д\.\s*)?37[\s,]*(?:стр\.?|с)\s*1(?=$|[,\s])/i.test(store.address)
}

function hasAddress(store) {
  return [store.address, store.addressFull?.street, store.addressFull?.house]
    .some(value => typeof value === 'string' && value.trim())
}

function pageSize(value, endpoint, offset, size) {
  const info = value?.meta
  if (!Number.isSafeInteger(info?.size) || info.size < offset || (size !== undefined && info.size !== size) ||
      !Number.isSafeInteger(info.limit) || info.limit < 1 || info.limit > 1000 || info.offset !== offset ||
      !Array.isArray(value.rows) || value.rows.length !== Math.min(info.limit, info.size - offset)) {
    throw new InventoryError('MOYSKLAD_INCOMPLETE_PAGE', { endpoint })
  }
  if (info.nextHref !== undefined) {
    const next = URL.parse(info.nextHref)
    const expected = new URL(endpoint, API)
    const nextOffset = offset + value.rows.length
    if (!next || next.origin !== expected.origin || next.pathname !== expected.pathname ||
        next.username || next.password || nextOffset >= info.size ||
        next.searchParams.getAll('offset').length !== 1 || next.searchParams.get('offset') !== String(nextOffset)) {
      throw new InventoryError('MOYSKLAD_INCOMPLETE_PAGE', { endpoint })
    }
  }
  return info.size
}

export function selectStore(stores, configuredId) {
  const active = stores.filter(store => store.archived === false)
  const matches = active.filter(matchesAddress)
  const requested = configuredId?.toLowerCase()
  const explicit = active.find(store => store.id.toLowerCase() === requested)
  // A configured UUID is an explicit owner selection when the address is ambiguous or absent.
  const store = requested ? explicit : matches.length === 1 ? matches[0] : undefined
  if (!store || (requested && !matches.includes(store) && (matches.length > 0 || hasAddress(store)))) {
    throw new InventoryError('STORE_SELECTION_HOLD', { visibleStores: stores.length, addressMatches: matches.length })
  }
  return { store, addressVerified: matches.includes(store) }
}

export function createStockReader(token, fetchImpl = fetch, { minimumIntervalMs = 300 } = {}) {
  if (!token?.trim()) throw new InventoryError('AUTH_HOLD')
  let nextRequest = 0

  async function get(path, params, headers, retried = false) {
    const url = new URL(path, API)
    url.search = new URLSearchParams(params).toString()
    if (nextRequest > Date.now()) await delay(nextRequest - Date.now())
    nextRequest = Date.now() + minimumIntervalMs
    let response
    try {
      response = await fetchImpl(url, {
        method: 'GET', redirect: 'error', signal: AbortSignal.timeout(12_000),
        headers: { Authorization: 'Bearer ' + token, 'Accept-Encoding': 'gzip', Accept: 'application/json;charset=utf-8', ...headers },
      })
    } catch {
      if (!retried) return get(path, params, headers, true)
      throw new InventoryError('MOYSKLAD_NETWORK_ERROR', { endpoint: path })
    }
    if (RETRYABLE_HTTP.has(response.status) && !retried) {
      await response.body?.cancel()
      return get(path, params, headers, true)
    }
    if (response.status !== 200) throw new InventoryError('MOYSKLAD_HTTP_ERROR', { endpoint: path, status: response.status })
    try {
      return await response.json()
    } catch {
      throw new InventoryError('MOYSKLAD_INVALID_RESPONSE', { endpoint: path })
    }
  }

  async function list(path, archived = false) {
    if (!COLLECTIONS.has(path)) throw new InventoryError('INVALID_READ_ENDPOINT')
    const items = new Map()
    const assortment = path === 'entity/assortment'
    const entityType = ['entity/product', 'entity/variant'].includes(path) ? path.slice('entity/'.length) : undefined
    const params = assortment ? { filter: 'archived=' + archived, groupBy: 'variant' }
      : entityType ? { filter: 'archived=' + archived } : {}
    const headers = assortment ? { 'X-Lognex-Remap-Beta-Feature': 'assortmentWithoutStock' } : undefined
    let size
    do {
      const offset = items.size
      const value = await get(path, { ...params, limit: '1000', offset: String(offset) }, headers)
      size = pageSize(value, path, offset, size)
      for (const record of value.rows) {
        if (!isUuid(record?.id) || items.has(record.id.toLowerCase()) ||
            ((assortment || entityType || path === 'entity/store') && typeof record.archived !== 'boolean') ||
            (assortment && !['product', 'variant', 'bundle', 'service'].includes(record.meta?.type)) ||
            (entityType && record.meta?.type !== entityType)) {
          throw new InventoryError('MOYSKLAD_INVALID_ENTITY', { endpoint: path })
        }
        items.set(record.id.toLowerCase(), { ...record, id: record.id.toLowerCase() })
      }
    } while (items.size < size)
    return [...items.values()]
  }

  async function fillMissingStock(storeId, missing, stocks) {
    const path = 'report/stock/bystore'
    const seen = new Set()
    let offset = 0
    let size
    do {
      const value = await get(path, {
        filter: 'store=' + API + 'entity/store/' + storeId + ';stockMode=all',
        groupBy: 'variant', limit: '1000', offset: String(offset),
      })
      size = pageSize(value, path, offset, size)
      for (const row of value.rows) {
        const id = linkedId(row, 'product') ?? linkedId(row, 'variant')
        if (!missing.has(id)) continue
        if (seen.has(id) || !Array.isArray(row.stockByStore)) throw new InventoryError('MOYSKLAD_INVALID_STOCK')
        seen.add(id)
        const selected = row.stockByStore.filter(item => linkedId(item, 'store') === storeId)
        if (selected.length > 1 || (selected[0] && !Number.isFinite(selected[0].stock))) {
          throw new InventoryError('MOYSKLAD_INVALID_STOCK')
        }
        if (selected[0]) stocks.set(id, selected[0].stock)
      }
      offset += value.rows.length
    } while (offset < size)
  }

  async function stock(storeId, assortmentIds) {
    if (!isUuid(storeId) || !assortmentIds.length || !assortmentIds.every(isUuid) || new Set(assortmentIds).size !== assortmentIds.length) {
      throw new InventoryError('INVALID_STOCK_FILTER')
    }
    const result = await get(STOCK_ENDPOINT, {
      filter: 'assortmentId=' + assortmentIds.join(',') + ';storeId=' + storeId,
      stockType: 'stock', include: 'zeroLines', withRecalculate: 'true',
    })
    if (!Array.isArray(result)) throw new InventoryError('MOYSKLAD_INVALID_STOCK')
    const allowed = new Set(assortmentIds)
    const stocks = new Map()
    for (const row of result) {
      const id = isUuid(row?.assortmentId) ? row.assortmentId.toLowerCase() : undefined
      if (!isUuid(row?.storeId) || row.storeId.toLowerCase() !== storeId || !allowed.has(id) || stocks.has(id) ||
          !(row.stock === null || (typeof row.stock === 'number' && Number.isFinite(row.stock)))) {
        throw new InventoryError('MOYSKLAD_INVALID_STOCK')
      }
      stocks.set(id, row.stock)
    }
    const missing = new Set(assortmentIds.filter(id => !stocks.has(id)))
    // The short report can omit a row even with zeroLines. Only explicit warehouse values can fill the gap.
    if (missing.size) await fillMissingStock(storeId, missing, stocks)
    return stocks
  }

  async function sellableStock(storeId, assortmentIds) {
    const allowed = new Set(assortmentIds)
    if (!isUuid(storeId) || !allowed.size || !assortmentIds.every(isUuid) || allowed.size !== assortmentIds.length) {
      throw new InventoryError('INVALID_STOCK_FILTER')
    }
    // Include the null store row, which carries reservations without a warehouse assignment.
    const result = await get(STOCK_ENDPOINT, {
      filter: 'assortmentId=' + assortmentIds.join(','),
      stockType: 'freeStock', include: 'zeroLines', withRecalculate: 'true',
    })
    if (!Array.isArray(result)) throw new InventoryError('MOYSKLAD_INVALID_SELLABLE_STOCK')
    const quantities = new Map()
    const unassigned = new Map()
    const seen = new Set()
    for (const row of result) {
      const id = isUuid(row?.assortmentId) ? row.assortmentId.toLowerCase() : undefined
      const rowStore = row?.storeId === null ? null : isUuid(row?.storeId) ? row.storeId.toLowerCase() : undefined
      const key = id + ':' + rowStore
      const count = row?.freeStock
      if (!allowed.has(id) || rowStore === undefined || seen.has(key) ||
          !(count === null || (Number.isFinite(count) && Math.abs(count) <= Number.MAX_SAFE_INTEGER)) ||
          (rowStore === null && count > 0)) {
        throw new InventoryError('MOYSKLAD_INVALID_SELLABLE_STOCK')
      }
      seen.add(key)
      if (rowStore === storeId) quantities.set(id, count)
      else if (rowStore === null) unassigned.set(id, count)
    }
    for (const [id, quantity] of quantities) {
      const reserved = unassigned.has(id) ? unassigned.get(id) : 0
      quantities.set(id, quantity === null || reserved === null ? null : Math.max(0, quantity + reserved))
    }
    return quantities
  }

  async function reconciliationSources() {
    const archivedAssortment = await list('entity/assortment', true)
    const activeProducts = await list('entity/product')
    const archivedProducts = await list('entity/product', true)
    const activeVariants = await list('entity/variant')
    const archivedVariants = await list('entity/variant', true)
    return { archivedAssortment, activeProducts, archivedProducts, activeVariants, archivedVariants }
  }

  return { stores: () => list('entity/store'), assortment: () => list('entity/assortment'),
    units: () => list('entity/uom'), stock, sellableStock, reconciliationSources }
}
