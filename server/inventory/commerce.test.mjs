import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { products } from '../../src/data/products.ts'
import { feedOfferId } from '../../src/data/feedOfferIds.ts'
import { availabilityFor, offerAvailability, parseCommerceAvailability, parseInventory, STOCK_MAX_AGE_MS } from '../../src/lib/inventory.ts'
import { renderYml } from '../../scripts/product-feed.mjs'
import { parseCommercePolicy, publishCommerceState } from './commerce.mjs'
import { createStockReader } from './moysklad.mjs'
import { publishSnapshot } from './sync.mjs'

const uuid = index => '12345678-1234-1234-1234-' + String(index).padStart(12, '0')
const storeId = uuid(1)
const items = ['671-A227', '8305-W', '8225-6-B1', 'A9001', 'C807601-36'].map(sku => products.find(product => product.sku === sku))
const [matting, gray, cream, smallPhoto, ash] = items
const approval = {
  version: 1, legalName: 'Тест & Партнёры', delivery: false, pickup: true,
  approvedPriceMinor: Object.fromEntries(items.map(product => [product.id, product.priceRub * 100 + (product === ash ? 1 : 0)])),
}

test('read-only free stock subtracts reservations without a warehouse and ignores other warehouses', async () => {
  const ids = [uuid(2), uuid(3), uuid(4), uuid(5)]
  const rows = [
    { assortmentId: ids[0], storeId, freeStock: 5 },
    { assortmentId: ids[0], storeId: null, freeStock: -3 },
    { assortmentId: ids[0], storeId: uuid(9), freeStock: 100 },
    { assortmentId: ids[1], storeId, freeStock: 1 },
    { assortmentId: ids[1], storeId: null, freeStock: -2 },
    { assortmentId: ids[2], storeId, freeStock: null },
    { assortmentId: ids[3], storeId: uuid(9), freeStock: 5 },
  ]
  const reader = createStockReader('synthetic-test-token', async request => {
    const url = new URL(request)
    assert.equal(url.searchParams.get('filter'), 'assortmentId=' + ids.join(','))
    assert.equal(url.searchParams.get('stockType'), 'freeStock')
    return Response.json(rows)
  }, { minimumIntervalMs: 0 })
  assert.deepEqual([...await reader.sellableStock(storeId, ids)], [[ids[0], 2], [ids[1], 0], [ids[2], null]])
  rows.push(rows[0])
  await assert.rejects(reader.sellableStock(storeId, ids), /MOYSKLAD_INVALID_SELLABLE_STOCK/)
})

test('policy requires an approved seller, fulfillment, exact product IDs and integer minor currency units', () => {
  assert.equal(parseCommercePolicy(approval), approval)
  assert.throws(() => parseCommercePolicy({ ...approval, pickup: false }), /INVALID_COMMERCE_POLICY/)
  assert.throws(() => parseCommercePolicy({ ...approval, approvedPriceMinor: { phantom: 100 } }), /INVALID_COMMERCE_POLICY/)
  assert.throws(() => parseCommercePolicy({ ...approval, approvedPriceMinor: { [ash.id]: 1.5 } }), /INVALID_COMMERCE_POLICY/)
})

test('feed and Product Offer stay aligned with fresh approved saleable stock and fail closed upon stale or changed data', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'dekoray-commerce-'))
  try {
    const webroot = join(temporary, 'www', 'public')
    const privateDirectory = join(temporary, 'dekoray-leads')
    const stateFile = join(privateDirectory, 'commerce-state.json')
    const stockFile = join(webroot, 'generated', 'inventory.json')
    await mkdir(privateDirectory, { mode: 0o700 })
    await mkdir(join(webroot, 'generated'), { recursive: true })
    await mkdir(join(webroot, 'api'))
    const endpoint = join(webroot, 'api', 'commerce.php')
    await cp(new URL('./commerce-entry.php', import.meta.url), endpoint)
    const php = process.env.DEKORAY_PHP_BIN ?? 'php'
    const request = path => execFileSync(php, ['-r', '$_SERVER["REQUEST_URI"]=$argv[1]; $_SERVER["REQUEST_METHOD"]="GET"; require $argv[2];', path, endpoint], { encoding: 'utf8' })
    const moment = Date.now() - 1000
    const direct = renderYml(new Date(moment))
    await writeFile(join(webroot, 'yml-direct.xml'), direct)
    await writeFile(join(webroot, 'yml.xml'), renderYml(new Date(moment), { channel: 'search' }))
    const ids = new Map(items.map((product, index) => [product.id, uuid(index + 10)]))
    const stock = updatedAt => ({ version: 1, source: 'moysklad', updatedAt: new Date(updatedAt).toISOString(), items: products.map(product => ids.has(product.id)
      ? { id: product.id, unit: product.unit, quantity: product === cream ? 0 : 4 } : { id: product.id, reason: 'unmapped' }) })
    const publish = async (snapshotTime, generationTime = moment) => {
      const snapshot = stock(snapshotTime)
      const manifest = { storeId, updatedAt: snapshot.updatedAt, entries: snapshot.items.map(({ id, unit, quantity }) => ({
        productId: id, crmId: ids.get(id), quantity, unit, stockStatus: ids.has(id) ? 'verified' : 'not_mapped', crmType: 'product',
      })) }
      const reader = { sellableStock: async (requestedStore, requestedIds) => {
        assert.equal(requestedStore, storeId)
        assert.deepEqual(new Set(requestedIds), new Set([ids.get(matting.id), ids.get(gray.id), ids.get(smallPhoto.id)]))
        return new Map([[ids.get(matting.id), 2], [ids.get(gray.id), 0], [ids.get(smallPhoto.id), 4]])
      } }
      await publishSnapshot(stockFile, snapshot, products, generationTime)
      assert.deepEqual(await publishCommerceState({ file: stateFile, webroot, reader, snapshot, manifest, policy: approval, now: () => generationTime }), { availableOffers: 2 })
      return { snapshot, manifest, reader }
    }
    const { snapshot, manifest, reader } = await publish(moment)
    const state = JSON.parse(await readFile(stateFile, 'utf8'))
    const fresh = JSON.parse(request('/generated/commerce.json'))
    assert.deepEqual(new Set(fresh.saleable), new Set([matting.id, smallPhoto.id]))
    const approvedStock = parseCommerceAvailability(fresh, products)
    const inventory = parseInventory(snapshot, products, moment)
    for (const [id, expected] of [[matting.id, 'InStock'], [gray.id, undefined], [cream.id, 'OutOfStock'], [ash.id, undefined], [smallPhoto.id, 'InStock']]) {
      assert.equal(offerAvailability(availabilityFor(inventory, id, moment), id, approvedStock), expected)
      assert(request('/yml-direct.xml').includes(`<offer id="${feedOfferId(id)}" available="${expected === 'InStock'}">`))
    }
    assert.equal(offerAvailability(availabilityFor(inventory, matting.id, moment), matting.id,
      { ...approvedStock, updatedAt: '2026-01-01T00:00:00.000Z' }), undefined)
    assert.throws(() => parseCommerceAvailability({ ...fresh, saleable: [matting.id, matting.id] }, products), /Invalid commerce status/)
    const search = request('/yml.xml')
    assert.match(search, /<company>Тест &amp; Партнёры<\/company>/)
    assert.match(search, new RegExp(`<offer id="${feedOfferId(matting.id)}" available="true">`))
    assert(!search.includes(feedOfferId(smallPhoto.id)))
    assert.equal(state.direct, request('/yml-direct.xml'))
    await assert.rejects(publishCommerceState({ file: stateFile, webroot, reader, snapshot,
      manifest: { ...manifest, updatedAt: '' }, policy: approval }), /COMMERCE_SNAPSHOT_MISMATCH/)
    await publishSnapshot(stockFile, stock(moment + 100), products, moment + 100)
    assert.equal(JSON.parse(request('/generated/commerce.json')), null)
    assert.equal(request('/yml-direct.xml'), direct)
    await publish(moment - STOCK_MAX_AGE_MS - 1000, moment - STOCK_MAX_AGE_MS - 1000)
    assert.equal(JSON.parse(request('/generated/commerce.json')), null)
    assert.doesNotMatch(request('/yml.xml'), /<offer id=/)
    assert.equal(request('/yml-direct.xml'), direct)
    await publish(moment)
    await writeFile(join(webroot, 'yml-direct.xml'), direct.replace('<price>7000</price>', '<price>7001</price>'))
    assert.equal(JSON.parse(request('/generated/commerce.json')), null)
    await assert.rejects(publishCommerceState({ file: stateFile, webroot, reader, snapshot, manifest, policy: approval }), /COMMERCE_CATALOG_RELEASE_MISMATCH/)
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
})
