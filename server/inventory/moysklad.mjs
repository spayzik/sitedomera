import { setTimeout as delay } from 'node:timers/promises'

const API = 'https://api.moysklad.ru/api/remap/1.2/'
const COLLECTIONS = new Set(['entity/store', 'entity/assortment', 'entity/uom'])
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

  async function get(path, params, headers) {
    const url = new URL(path, API)
    url.search = new URLSearchParams(params).toString()
    if (nextRequest > Date.now()) await delay(nextRequest - Date.now())
    nextRequest = Date.now() + minimumIntervalMs
    let response
    try {
      response = await fetchImpl(url, {
        method: 'GET', redirect: 'error', signal: AbortSignal.timeout(12_000),
        headers: { Authorization: 'Bearer ' + token, 'Accept-Encoding': 'gzip', Accept: 'application/json', ...headers },
      })
    } catch {
      throw new InventoryError('MOYSKLAD_NETWORK_ERROR', { endpoint: path })
    }
    if (response.status !== 200) throw new InventoryError('MOYSKLAD_HTTP_ERROR', { endpoint: path, status: response.status })
    try {
      return await response.json()
    } catch {
      throw new InventoryError('MOYSKLAD_INVALID_RESPONSE', { endpoint: path })
    }
  }

  async function list(path) {
    if (!COLLECTIONS.has(path)) throw new InventoryError('INVALID_READ_ENDPOINT')
    const items = new Map()
    const assortment = path === 'entity/assortment'
    const params = assortment ? { filter: 'archived=false', groupBy: 'variant' } : {}
    const headers = assortment ? { 'X-Lognex-Remap-Beta-Feature': 'assortmentWithoutStock' } : undefined
    let size
    do {
      const offset = items.size
      const value = await get(path, { ...params, limit: '1000', offset: String(offset) }, headers)
      const info = value?.meta
      if (!Number.isSafeInteger(info?.size) || info.size < offset || (size !== undefined && info.size !== size) ||
          !Number.isSafeInteger(info.limit) || info.limit < 1 || info.limit > 1000 || info.offset !== offset ||
          !Array.isArray(value.rows) || value.rows.length !== Math.min(info.limit, info.size - offset)) {
        throw new InventoryError('MOYSKLAD_INCOMPLETE_PAGE', { endpoint: path })
      }
      size = info.size
      for (const record of value.rows) {
        if (!isUuid(record?.id) || items.has(record.id.toLowerCase()) ||
            ((assortment || path === 'entity/store') && typeof record.archived !== 'boolean') ||
            (assortment && !['product', 'variant', 'bundle', 'service'].includes(record.meta?.type))) {
          throw new InventoryError('MOYSKLAD_INVALID_ENTITY', { endpoint: path })
        }
        items.set(record.id.toLowerCase(), { ...record, id: record.id.toLowerCase() })
      }
    } while (items.size < size)
    return [...items.values()]
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
    return stocks
  }

  return { stores: () => list('entity/store'), assortment: () => list('entity/assortment'),
    units: () => list('entity/uom'), stock }
}
