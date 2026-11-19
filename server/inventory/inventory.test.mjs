import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createStockReader, selectStore } from './moysklad.mjs'
import { importInventory, publishSnapshot } from './sync.mjs'
import { parseInventory, availabilityFor, STOCK_MAX_AGE_MS } from '../../src/lib/inventory.ts'

const uuid = n => 'a0000000-0000-0000-0000-' + String(n).padStart(12, '0')
const storeId = uuid(1)
const otherStore = uuid(2)
const base = 'https://api.moysklad.ru/api/remap/1.2/'
const meta = (type, id) => ({ type, href: base + 'entity/' + type + '/' + id })
const item = (n, article, type = 'product', unit = uuid(8), extra = {}) => ({
  id: uuid(n), archived: false, article, meta: meta(type, uuid(n)), uom: { meta: meta('uom', unit) }, ...extra,
})
const stores = [
  { id: storeId, archived: false, address: 'Москва, Алтуфьевское ш., 37с1' },
  { id: otherStore, archived: false, address: 'Москва, Алтуфьевское ш., 37с11' },
]
const site = [
  { id: 'sheet-a', sku: 'A9001', unit: 'лист' },
  { id: 'sheet-b', sku: 'B9001', unit: 'лист' },
  { id: 'manual', sku: null, unit: 'лист' },
  { id: 'missing', sku: null, unit: 'лист' },
  { id: 'duplicate', sku: 'D9001', unit: 'шт' },
  { id: 'wrong-unit', sku: 'U9001', unit: 'лист' },
  { id: 'archive', sku: 'Z9001', unit: 'лист' },
  { id: 'bundle', sku: 'KIT1', unit: 'лист' },
]
const entities = [
  item(11, 'A9001'), item(12, 'B9001'), item(13, 'PARENT', 'product', uuid(8), { variantsCount: 1 }),
  item(14, undefined, 'variant', uuid(9), { product: { meta: meta('product', uuid(13)) } }),
  item(15, 'D9001'), item(16, 'D9001'), item(17, 'U9001', 'product', uuid(9)),
  item(18, 'Z9001', 'product', uuid(8), { archived: true }), item(19, 'KIT1', 'bundle'),
]
const manual = { manual: { id: uuid(14), type: 'variant' } }
const now = Date.parse('2026-11-19T12:00:00.000Z')
const row = (id, stock, warehouse = storeId) => ({ assortmentId: uuid(id), storeId: warehouse, stock })
const okRows = [row(11, 18), row(12, 0), row(14, 2.5)]
function provider({ stocks = okRows, status, brokenPage, onRequest } = {}) {
  return async (url, init) => {
    assert.equal(init.method, 'GET')
    assert.equal(init.redirect, 'error')
    assert.equal(init.headers.Authorization, 'Bearer synthetic')
    assert.equal(init.headers.Accept, 'application/json;charset=utf-8')
    assert.equal(init.headers['Accept-Encoding'], 'gzip')
    const route = url.pathname.replace('/api/remap/1.2/', '')
    onRequest?.(route)
    if (route === 'report/stock/bystore/current') {
      assert.equal(url.searchParams.get('stockType'), 'stock')
      assert.equal(url.searchParams.get('withRecalculate'), 'true')
      assert.equal(url.searchParams.get('include'), 'zeroLines')
      assert.match(url.searchParams.get('filter'), new RegExp(';storeId=' + storeId + '$'))
      assert.ok(url.searchParams.get('filter').startsWith('assortmentId='))
      if (status === 'timeout') throw new DOMException('fixture', 'TimeoutError')
      if (status) return Response.json({}, { status })
      return Response.json(stocks)
    }
    const rows = { 'entity/store': stores, 'entity/assortment': entities,
      'entity/uom': [{ id: uuid(8), name: 'Лист' }, { id: uuid(9), name: 'шт.' }] }[route]
    assert.ok(rows, route)
    if (route === 'entity/assortment') assert.equal(init.headers['X-Lognex-Remap-Beta-Feature'], 'assortmentWithoutStock')
    const offset = Number(url.searchParams.get('offset'))
    const result = rows.slice(offset, offset + 2)
    if (brokenPage && route === 'entity/assortment' && offset === 2) result.pop()
    return Response.json({ meta: { size: rows.length, limit: 2, offset }, rows: result })
  }
}
const make = (fetcher = provider()) => createStockReader('synthetic', fetcher, { minimumIntervalMs: 0 })
const load = (reader = make()) => importInventory({ reader, products: site, storeId, manual, now: () => now })
const states = snapshot => parseInventory(snapshot, site, now)

test('selects the exact Moscow address, never a similar address or ambiguous warehouse', () => {
  assert.equal(selectStore(stores).store.id, storeId)
  assert.throws(() => selectStore(stores, otherStore), /STORE_SELECTION_HOLD/)
  assert.throws(() => selectStore([stores[1]]), /STORE_SELECTION_HOLD/)
  assert.throws(() => selectStore([stores[1]], otherStore), /STORE_SELECTION_HOLD/)
  assert.equal(selectStore([{ id: otherStore, archived: false }], otherStore).addressVerified, false)
  assert.throws(() => selectStore([...stores, { ...stores[0], id: uuid(3) }]), /STORE_SELECTION_HOLD/)
  const full = { id: uuid(4), archived: false, addressFull: { city: 'Москва', street: 'Алтуфьевское шоссе', house: '37с1' } }
  assert.equal(selectStore([full]).store.id, uuid(4))
})

test('maps exact articles and manual variants with parent units, exposes no CRM identity in the snapshot', async () => {
  const { snapshot, summary, manifest } = await load()
  const data = states(snapshot)
  assert.deepEqual(summary.mapping, { matched: 3, unmatched: 4, ambiguous: 1 })
  assert.equal(manifest.storeId, storeId)
  assert.match(JSON.stringify(manifest), new RegExp(uuid(14)))
  assert.doesNotMatch(JSON.stringify(snapshot), /a0000000|synthetic/)
  assert.equal(availabilityFor(data, 'sheet-a', now).quantity, 18)
  assert.equal(availabilityFor(data, 'sheet-b', now).status, 'out_of_stock')
  assert.equal(availabilityFor(data, 'manual', now).quantity, 2.5)
  assert.deepEqual(availabilityFor(data, 'wrong-unit', now), { status: 'unknown', reason: 'invalid_data' })
  for (const id of ['missing', 'duplicate', 'archive', 'bundle']) {
    assert.deepEqual(availabilityFor(data, id, now), { status: 'unknown', reason: 'unmapped' })
  }
  assert.deepEqual(availabilityFor(data, 'sheet-a', now + STOCK_MAX_AGE_MS), { status: 'unknown', reason: 'stale' })
})

test('missing, recalculating and negative numbers stay unknown, including after a previous positive', async () => {
  const output = await load(make(provider({ stocks: [row(12, null), row(14, -3)] })))
  const data = states(output.snapshot)
  for (const id of ['sheet-a', 'sheet-b', 'manual']) {
    assert.deepEqual(availabilityFor(data, id, now), { status: 'unknown', reason: 'invalid_data' })
  }
})

test('corrupt pages, wrong store, foreign UUIDs, duplicated rows and transport failures reject the import', async () => {
  for (const options of [
    { brokenPage: true }, { stocks: { rows: okRows } }, { stocks: [row(11, 18, otherStore)] },
    { stocks: [row(20, 18)] }, { stocks: [row(11, '18')] }, { stocks: [row(11, 18), row(11, 16)] },
    { status: 401 }, { status: 403 }, { status: 429 }, { status: 'timeout' },
  ]) await assert.rejects(load(make(provider(options))))
})

test('atomic publication replaces one validated file only; failed updates leave bytes intact', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'dekoray-inventory-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const file = join(dir, 'inventory.json')
  const { snapshot } = await load()
  await publishSnapshot(file, snapshot, site, now)
  const previous = await readFile(file, 'utf8')
  await assert.rejects(publishSnapshot(file, { ...snapshot, items: snapshot.items.slice(1) }, site, now))
  assert.equal(await readFile(file, 'utf8'), previous)
  await assert.rejects(load(make(provider({ status: 429 }))))
  assert.equal(await readFile(file, 'utf8'), previous)
  const second = await importInventory({ reader: make(provider({ stocks: [row(11, 13), row(12, 0), row(14, 2.5)] })), products: site, storeId, manual, now: () => now + 60000 })
  await publishSnapshot(file, second.snapshot, site, now + 60000)
  assert.equal(availabilityFor(parseInventory(JSON.parse(await readFile(file, 'utf8')), site, now + 60000), 'sheet-a', now + 60000).quantity, 13)
})

test('browser rejects future timestamps, changed units, duplicates and unexpected CRM fields', async () => {
  const { snapshot } = await load()
  assert.throws(() => parseInventory(snapshot, site, now - 10 * 60000))
  assert.throws(() => states({ ...snapshot, items: [...snapshot.items.slice(0, -1), snapshot.items[0]] }))
  assert.throws(() => states({ ...snapshot, items: [{ ...snapshot.items[0], unit: 'шт' }, ...snapshot.items.slice(1)] }))
  assert.throws(() => states({ ...snapshot, storeId }))
})


test('owner-approved UUID takes precedence over automatic claims; two explicit claims stay unknown', async () => {
  const additional = { id: 'owner-selected', sku: null, unit: 'лист' }
  const products = [...site, additional]
  const reader = make(provider())
  const mapping = { ...manual, [additional.id]: { id: uuid(11), type: 'product' } }
  const { snapshot } = await importInventory({ reader, products, storeId, manual: mapping, now: () => now })
  const stock = parseInventory(snapshot, products, now)
  assert.equal(availabilityFor(stock, 'sheet-a', now).status, 'unknown')
  assert.equal(availabilityFor(stock, additional.id, now).quantity, 18)
  mapping['sheet-a'] = mapping[additional.id]
  const withoutConflict = make(provider({ stocks: [row(12, 0), row(14, 2.5)] }))
  const conflicted = await importInventory({ reader: withoutConflict, products, storeId, manual: mapping, now: () => now })
  const blocked = parseInventory(conflicted.snapshot, products, now)
  assert.equal(availabilityFor(blocked, 'sheet-a', now).status, 'unknown')
  assert.equal(availabilityFor(blocked, additional.id, now).status, 'unknown')
})


test('preflight blocks writing a private manifest without a webroot or inside the repository', () => {
  const run = fileURLToPath(new URL('./run.mjs', import.meta.url))
  const manifest = fileURLToPath(new URL('../../public/generated/inventory.json', import.meta.url))
  for (const root of ['', tmpdir()]) {
    const proc = spawnSync(process.execPath, [run, 'preflight'], {
      encoding: 'utf8', timeout: 1000,
      env: { ...process.env, MOYSKLAD_API_TOKEN: 'synthetic', MOYSKLAD_STORE_ID: '',
        DEKORAY_INVENTORY_MAP_FILE: '', DEKORAY_INVENTORY_WEBROOT: root,
        DEKORAY_INVENTORY_MANIFEST_FILE: manifest },
    })
    assert.equal(proc.status, 1)
    assert.equal(JSON.parse(proc.stderr).status, 'CONFIG_HOLD')
  }
})
