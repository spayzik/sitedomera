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
function provider({ stocks = okRows, expandedStocks = [], status, brokenPage, onRequest } = {}) {
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
    if (route === 'report/stock/bystore') {
      assert.equal(url.searchParams.get('filter'), 'store=' + base + 'entity/store/' + storeId + ';stockMode=all')
      assert.equal(url.searchParams.get('groupBy'), 'variant')
      const offset = Number(url.searchParams.get('offset'))
      return Response.json({ meta: { size: expandedStocks.length, limit: 2, offset }, rows: expandedStocks.slice(offset, offset + 2) })
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

test('uses an explicit missing-row stock from the expanded report at the selected store only', async () => {
  const expandedRow = (id, type, warehouse, stock) => ({
    meta: meta(type, uuid(id)), stockByStore: [{ meta: meta('store', warehouse), stock }],
  })
  const expandedStocks = [expandedRow(12, 'product', otherStore, 5),
    expandedRow(11, 'product', storeId, 0), expandedRow(14, 'variant', storeId, 27)]
  const result = await load(make(provider({ stocks: [row(14, null)], expandedStocks })))
  const data = states(result.snapshot)
  assert.equal(availabilityFor(data, 'sheet-a', now).status, 'out_of_stock')
  assert.equal(availabilityFor(data, 'sheet-b', now).status, 'unknown')
  assert.equal(availabilityFor(data, 'manual', now).status, 'unknown')
  const duplicated = [...expandedStocks, expandedRow(11, 'product', storeId, 2)]
  await assert.rejects(load(make(provider({ stocks: [row(14, null)], expandedStocks: duplicated }))), /MOYSKLAD_INVALID_STOCK/)
})

test('a reviewed single-panel mapping counts pieces as sheets and keeps conflicting SKUs out', async () => {
  const name = 'Бамбуковая стеновая панель 1220*3000*7мм P01'
  const panel = { id: 'panel', sku: 'P01', kind: 'panel', unit: 'лист' }
  const slat = { id: 'slat', sku: 'S01', kind: 'slat', unit: 'шт' }
  const products = [panel, slat]
  const mapping = { panel: { id: uuid(21), type: 'product', singleSheetName: name }, slat: null }
  const rows = [item(21, panel.sku, 'product', uuid(9), { name }), item(22, slat.sku, 'product', uuid(9))]
  const loadMapping = (assortment, manual = mapping, catalog = products) => importInventory({
    reader: {
      stores: async () => stores,
      assortment: async () => assortment,
      units: async () => [{ id: uuid(9), name: 'шт.' }],
      stock: async (_store, ids) => new Map(ids.map(id => [id, 18])),
    },
    products: catalog, storeId, manual, now: () => now,
  })

  const { snapshot } = await loadMapping(rows)
  assert.deepEqual(snapshot.items, [{ id: 'panel', unit: 'лист', quantity: 18 }, { id: 'slat', reason: 'unmapped' }])
  for (const changed of [{ name: 'Упаковка панелей P01' }, { article: 'P02' }, { variantsCount: 2 },
    { packs: [{ quantity: 2 }] }]) {
    const { snapshot: changedSnapshot } = await loadMapping([{ ...rows[0], ...changed }, rows[1]])
    assert.equal(availabilityFor(parseInventory(changedSnapshot, products, now), 'panel', now).status, 'unknown')
  }
  const { snapshot: unreviewed } = await loadMapping(rows, { slat: null })
  assert.equal(availabilityFor(parseInventory(unreviewed, products, now), 'panel', now).status, 'unknown')
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

test('does not publish stock for exact articles with a different type or size', async () => {
  const dimensions = { widthMm: 1220, lengthMm: 3000 }
  const products = [
    { id: 'same', sku: 'EXACT', unit: 'лист', kind: 'panel', dimensions, thicknessMm: 8 },
    { id: 'wrong-width', sku: 'WIDTH', unit: 'лист', kind: 'panel', dimensions, thicknessMm: 8 },
    { id: 'wrong-thickness', sku: 'THICK', unit: 'лист', kind: 'panel', dimensions, thicknessMm: 8 },
    { id: 'wrong-type', sku: 'KIND', unit: 'лист', kind: 'panel', dimensions, thicknessMm: 8 },
    { id: 'no-spec', sku: 'SPEC', unit: 'лист', kind: 'panel', dimensions, thicknessMm: 8 },
    { id: 'conflicting-thickness', sku: 'CONFLICT-T', unit: 'лист', kind: 'panel', dimensions, thicknessMm: 8 },
    { id: 'conflicting-type', sku: 'CONFLICT-K', unit: 'лист', kind: 'panel', dimensions, thicknessMm: 8 },
  ]
  const assortment = [
    item(31, 'Exact', 'product', uuid(8), { name: 'Бамбуковая панель 1220 × 3000 × 8 мм' }),
    item(32, 'WIDTH', 'product', uuid(8), { name: 'Панель 1210*3000*8мм' }),
    item(33, 'THICK', 'product', uuid(8), { name: 'Панель 1220x3000x7 мм' }),
    item(34, 'KIND', 'product', uuid(8), { name: 'Декоративная рейка 1220×3000×8 мм' }),
    item(35, 'SPEC', 'product', uuid(8), { name: 'Панель SPEC' }),
    item(36, 'CONFLICT-T', 'product', uuid(8), { name: 'Панель 1220×3000×5 мм', attributes: [{ name: 'Толщина (мм)', value: 8 }] }),
    item(37, 'CONFLICT-K', 'product', uuid(8), { name: 'Рейка 1220×3000×8 мм', attributes: [{ name: 'Тип изделия', value: 'Панель' }] }),
  ]
  const requested = []
  const reader = {
    stores: async () => stores, assortment: async () => assortment,
    units: async () => [{ id: uuid(8), name: 'лист' }],
    stock: async (_store, ids) => {
      requested.push(...ids)
      return new Map(ids.map(id => [id, 12]))
    },
  }
  const result = await importInventory({ reader, products, storeId, now: () => now })
  assert.deepEqual(requested, [uuid(31)])
  assert.deepEqual(result.manifest.entries.map(entry => entry.reason),
    [undefined, 'dimensions_mismatch', 'dimensions_mismatch', 'type_mismatch', 'spec_unverified', 'dimensions_mismatch', 'type_mismatch'])
  assert.deepEqual(result.snapshot.items, [
    { id: 'same', unit: 'лист', quantity: 12 },
    ...products.slice(1).map(({ id }) => ({ id, reason: 'unmapped' })),
  ])
})

test('does not promote similar or alternate identifiers, but records them privately', async () => {
  const products = [
    { id: 'lookalike', sku: 'A9001', unit: 'лист' },
    { id: 'other-field', sku: 'B9001', unit: 'лист' },
    { id: 'archived-only', sku: 'Z9001', unit: 'лист' },
    { id: 'missing-article', sku: null, unit: 'лист' },
  ]
  const assortment = [
    item(31, 'А\u200b9001'),
    item(32, 'B-DIFFERENT', 'product', uuid(8), { externalCode: 'B9001' }),
    item(33, 'Z9001', 'product', uuid(8), { archived: true }),
  ]
  const reader = {
    stores: async () => stores, assortment: async () => assortment,
    units: async () => [{ id: uuid(8), name: 'лист' }],
    stock: async () => assert.fail('a suspect item must not reach the stock request'),
  }
  const result = await importInventory({ reader, products, storeId, now: () => now })
  assert.deepEqual(result.manifest.entries.map(({ reason }) => reason),
    ['similar_article', 'alternate_identifier', 'archived_only', 'missing_catalog_sku'])
  assert.deepEqual(result.manifest.entries.map(({ candidates }) => candidates.length), [1, 1, 1, 0])
  assert.doesNotMatch(JSON.stringify(result.snapshot), /9001|a0000000/)
})

test('nextHref is checked without contacting its host or accepting a skipped page', async () => {
  for (const target of [
    base + 'entity/assortment?offset=4', 'https://elsewhere.invalid/api/remap/1.2/entity/assortment?offset=2',
  ]) {
    let requests = 0
    const reader = make(async (url) => {
      requests++
      assert.equal(url.origin, 'https://api.moysklad.ru')
      return Response.json({ meta: { size: 3, limit: 2, offset: 0, nextHref: target }, rows: entities.slice(0, 2) })
    })
    await assert.rejects(reader.assortment(), /MOYSKLAD_INCOMPLETE_PAGE/)
    assert.equal(requests, 1)
  }
})

test('confidential reconciliation counts complete named sources and does not use extra rows for public stock', async () => {
  const providerFetch = provider()
  const queries = []
  const reader = make(async (url, init) => {
    const route = url.pathname.replace('/api/remap/1.2/', '')
    const filter = url.searchParams.get('filter')
    queries.push([route, filter])
    if (filter === 'archived=true' || route === 'entity/product' || route === 'entity/variant') {
      const rows = filter === 'archived=true' ? [] : route === 'entity/product' ? [item(44, 'MISSING')] : []
      return Response.json({ meta: { size: rows.length, limit: 2, offset: 0 }, rows })
    }
    return providerFetch(url, init)
  })
  const products = [{ id: 'absent-in-assortment', sku: 'MISSING', unit: 'лист' }]
  const result = await importInventory({ reader, products, storeId, now: () => now, reconcile: true })
  assert.ok(queries.some(([route, filter]) => route === 'entity/assortment' && filter === 'archived=true'))
  assert.ok(queries.some(([route]) => route === 'entity/variant'))
  assert.equal(result.summary.sources.activeProducts, 1)
  assert.equal(result.summary.sources.productsMissingFromAssortment, 1)
  assert.equal(result.manifest.entries[0].reason, 'excluded_from_assortment')
  assert.equal(result.manifest.entries[0].candidates[0].id, uuid(44))
  assert.deepEqual(result.snapshot.items, [{ id: 'absent-in-assortment', reason: 'unmapped' }])
})

test('retries transient read failures once and fails malformed or unauthorized responses without retry', async () => {
  for (const [status, expectedRequests] of [[503, 2], [401, 1], [403, 1], [429, 1]]) {
    let requests = 0
    const reader = make(async () => {
      requests++
      if (requests === 1) return Response.json({}, { status })
      return Response.json({ meta: { size: 0, limit: 2, offset: 0 }, rows: [] })
    })
    if (status === 503) assert.deepEqual(await reader.assortment(), [])
    else await assert.rejects(reader.assortment(), /MOYSKLAD_HTTP_ERROR/)
    assert.equal(requests, expectedRequests)
  }
})

test('a variant uses explicit millimeter characteristics and its parent unit without inheriting parent stock', async () => {
  const parent = item(61, 'PARENT', 'product', uuid(8), { name: 'Панель 1220 × 3000 × 5 мм', variantsCount: 1 })
  const variant = item(62, 'VARIANT', 'variant', uuid(9), {
    product: { meta: meta('product', parent.id) },
    characteristics: [{ name: 'Толщина', value: '8 мм' }],
  })
  const products = [{ id: 'variant', sku: 'VARIANT', kind: 'panel', unit: 'лист',
    dimensions: { widthMm: 1220, lengthMm: 3000 }, thicknessMm: 8 }]
  const reader = {
    stores: async () => stores, assortment: async () => [parent, variant],
    units: async () => [{ id: uuid(8), name: 'лист' }],
    stock: async (_store, ids) => {
      assert.deepEqual(ids, [variant.id])
      return new Map([[variant.id, 4]])
    },
  }
  const report = await importInventory({ reader, products, storeId, now: () => now })
  assert.deepEqual(report.snapshot.items, [{ id: 'variant', unit: 'лист', quantity: 4 }])
})

test('confirmed external ID is exact, unambiguous and cannot supersede a confirmed UUID', async () => {
  const entity = item(62, 'SUPPLIER-ART', 'product', uuid(8), { externalCode: 'CaseSensitive' })
  const products = [{ id: 'uuid', sku: null, unit: 'лист' }, { id: 'external', sku: null, unit: 'лист' }]
  const read = (assortment, manual) => importInventory({
    reader: {
      stores: async () => stores, assortment: async () => assortment,
      units: async () => [{ id: uuid(8), name: 'лист' }],
      stock: async (_store, ids) => new Map(ids.map(id => [id, 4])),
    },
    products, storeId, manual, now: () => now,
  })
  const external = { external: { externalCode: 'CaseSensitive', type: 'product' } }
  const linked = await read([entity], external)
  assert.equal(linked.manifest.entries[1].via, 'externalCode')
  assert.equal(linked.manifest.entries[1].candidateCount, 1)
  assert.equal(linked.manifest.entries[1].candidates[0].field, 'approved_externalCode')
  assert.equal(linked.snapshot.items[1].quantity, 4)
  const conflicted = await read([entity, { ...entity, id: uuid(63) }], external)
  assert.equal(conflicted.manifest.entries[1].reason, 'ambiguous')
  assert.equal(conflicted.manifest.entries[1].candidateCount, 2)
  const differentCase = await read([entity], { external: { ...external.external, externalCode: 'casesensitive' } })
  assert.equal(differentCase.manifest.entries[1].reason, 'approved_entity_unavailable')
  const uuidFirst = await read([entity], { ...external, uuid: { id: entity.id, type: 'product' } })
  assert.equal(uuidFirst.snapshot.items[0].quantity, 4)
  assert.deepEqual(uuidFirst.snapshot.items[1], { id: 'external', reason: 'unmapped' })
})
