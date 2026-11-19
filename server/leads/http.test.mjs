import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdtemp, readFile, rm, rmdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createLeadServer } from './http.mjs'
import { createLedger } from './ledger.mjs'
import { createMoySklad } from './moysklad.mjs'
import { createStockReader } from '../inventory/moysklad.mjs'
import { importInventory } from '../inventory/sync.mjs'
import { availabilityFor, parseInventory } from '../../src/lib/inventory.ts'

const origin = 'https://store.example'
const organizationId = 'd9edcfd8-bd63-4f87-9a9c-786119447b04'
const intakeStateId = 'ec5d5794-dbf5-4fbe-a6da-8eedc723105e'
const mappedProduct = '94898ac4-f516-4755-91e4-07dbd9ebaa9d'
const customerId = '7cdd0000-09ac-4500-ada2-f88240c7e22e'
const orderId = 'a106c786-6007-402c-90a3-20e9c181de7a'
const requestKey = '48fdd948-e15a-4755-9c71-644595fd77b2'
const config = {
  origin, organizationId, intakeStateId,
  consentVersion: 'preproduction-01', consentPath: '/legal/lead-consent.html',
  hashKey: '8'.repeat(64), token: 'synthetic-token-for-contract-test',
  catalog: new Map([['panel-blue', { type: 'product', id: mappedProduct, priceMinor: 129900 }]]),
}
const lead = {
  name: 'Синтетический Пример', phone: '+447700900123', email: '',
  comment: 'Синтетический тест', website: '',
  items: [{ id: 'panel-blue', qty: 3 }], consent: { accepted: true, version: config.consentVersion },
}

async function startTest(t, provider) {
  const directory = await mkdtemp(join(tmpdir(), 'dekoray-lead-test-'))
  const ledgerPath = join(directory, 'ledger.sqlite')
  const ledger = createLedger(ledgerPath, config.hashKey, 90)
  const logs = []
  const server = createLeadServer({ config, ledger, moysklad: createMoySklad(config, provider), log: code => logs.push(code) })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(async () => {
    await new Promise(resolve => server.close(resolve))
    ledger.close()
    for (const suffix of ['', '-wal', '-shm']) await rm(ledgerPath + suffix, { force: true })
    await rmdir(directory)
  })
  const url = 'http://127.0.0.1:' + server.address().port + '/api/lead'
  return {
    url, logs, ledgerPath,
    post: (body = lead, fields = {}) => fetch(url, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json', 'Idempotency-Key': requestKey, ...fields },
      body: JSON.stringify(body),
    }),
  }
}

test('only acknowledged order is accepted and a retry after timeout uses the same IDs', async t => {
  let counterparty
  let order
  let counterpartyCount = 0
  let orderCalls = 0
  let ordersCreated = 0
  const app = await startTest(t, async (url, options) => {
    assert.equal(new URL(url).origin, 'https://api.moysklad.ru')
    assert.equal(options.redirect, 'error')
    assert.ok(options.signal instanceof AbortSignal)
    if (options.method === 'GET') return Response.json({ rows: counterparty ? [counterparty] : [] })
    const body = JSON.parse(options.body)
    if (url.endsWith('/counterparty')) {
      counterpartyCount++
      counterparty = { id: customerId, meta: { type: 'counterparty' }, syncId: body.syncId }
      return Response.json(counterparty, { status: 201 })
    }
    orderCalls++
    assert.equal(body.applicable, false)
    assert.ok(body.state.meta.href.endsWith('/customerorder/metadata/states/' + intakeStateId))
    assert.ok(body.organization.meta.href.endsWith('/organization/' + organizationId))
    assert.ok(body.agent.meta.href.endsWith('/counterparty/' + customerId))
    assert.equal(body.positions[0].price, 129900)
    assert.equal(body.positions[0].quantity, 3)
    assert.ok(body.positions[0].assortment.meta.href.endsWith('/product/' + mappedProduct))
    assert.ok(body.description.includes('Согласие: ' + config.consentVersion))
    if (!order) {
      order = { id: orderId, meta: { type: 'customerorder' }, syncId: body.syncId, applicable: false }
      ordersCreated++
      throw new DOMException('synthetic timeout after remote store', 'TimeoutError')
    }
    assert.equal(body.syncId, order.syncId)
    return Response.json(order)
  })

  const rules = await fetch(app.url, { headers: { Origin: origin } })
  assert.deepEqual(await rules.json(), { status: 'ready', consentPath: config.consentPath, consentVersion: config.consentVersion })
  assert.equal(rules.headers.get('access-control-allow-origin'), origin)
  const first = await app.post()
  assert.equal(first.status, 503)
  assert.deepEqual(await first.json(), { error: 'temporarily_unavailable' })
  // A tab reload gives the client a new key. The same normalized request still replays.
  const reloaded = { 'Idempotency-Key': '54831c74-723f-42d7-847e-ce4bc9c7b1ac' }
  const retry = await app.post(lead, reloaded)
  assert.equal(retry.status, 201)
  assert.deepEqual(await retry.json(), { status: 'accepted', requestId: orderId })
  const repeat = await app.post()
  assert.equal(repeat.status, 200)
  assert.deepEqual(await repeat.json(), { status: 'accepted', requestId: orderId })
  const edited = await app.post({ ...lead, comment: 'Другой комментарий' })
  assert.equal(edited.status, 409)
  assert.equal((await app.post({ ...lead, comment: 'Другой комментарий' }, reloaded)).status, 409)
  assert.equal(counterpartyCount, 1)
  assert.equal(ordersCreated, 1)
  assert.equal(orderCalls, 2)
  assert.deepEqual(app.logs, ['temporarily_unavailable', 'accepted'])
  for (const path of [app.ledgerPath, app.ledgerPath + '-wal']) {
    const file = await readFile(path)
    for (const forbidden of [lead.name, lead.phone, lead.comment, config.token, requestKey]) {
      assert.equal(file.includes(Buffer.from(forbidden)), false)
    }
  }
})

test('invalid consent, unauthorized origins, untrusted prices and spam are rejected before provider calls', async t => {
  const app = await startTest(t, () => assert.fail('provider must not be called'))
  assert.equal((await app.post(lead, { Origin: 'https://untrusted.example' })).status, 403)
  assert.equal((await app.post(lead, { 'Content-Type': 'text/plain' })).status, 415)
  assert.equal((await app.post({ ...lead, consent: { accepted: false, version: config.consentVersion } })).status, 422)
  assert.equal((await app.post({ ...lead, consent: { accepted: true, version: 'old' } })).status, 422)
  assert.equal((await app.post({ ...lead, website: 'filled' })).status, 422)
  assert.equal((await app.post({ ...lead, items: [{ id: 'panel-blue', qty: 1, price: 1 }] })).status, 422)
  assert.equal((await app.post({ ...lead, items: [{ id: 'fake', qty: 1 }] })).status, 422)
  assert.equal((await app.post({ ...lead, comment: 'A'.repeat(17000) })).status, 413)
  assert.equal((await app.post({ ...lead, items: [{ id: 'panel-blue', qty: 0 }] })).status, 422)
  assert.equal((await app.post({ ...lead, contactInfo: 'extra' })).status, 422)
  assert.equal((await app.post(lead)).status, 429)
})

test('concurrent duplicate gets a retry response and unsupported upstream ACK cannot pass', async t => {
  let enterOrder
  const started = new Promise(resolve => { enterOrder = resolve })
  let releaseOrder
  const continueOrder = new Promise(resolve => { releaseOrder = resolve })
  const app = await startTest(t, async (url, options) => {
    if (options.method === 'GET') return Response.json({ rows: [{ id: customerId, meta: { type: 'counterparty' } }] })
    assert.ok(url.endsWith('/customerorder'))
    enterOrder()
    await continueOrder
    return Response.json({ id: orderId, meta: { type: 'customerorder' } }, { status: 201 })
  })
  const first = app.post()
  await started
  try {
    const busy = await app.post()
    assert.equal(busy.status, 409)
    assert.deepEqual(await busy.json(), { error: 'request_in_progress' })
  } finally {
    releaseOrder()
  }
  assert.equal((await first).status, 503)
  assert.deepEqual(app.logs, ['temporarily_unavailable'])
})


test('a five-sheet lead leaves the physical stock at 18; only a later provider change produces 13', async t => {
  const storeId = 'd9edcfd8-bd63-4f87-9a9c-786119447b05'
  const unitId = 'd9edcfd8-bd63-4f87-9a9c-786119447b06'
  const product = { id: 'panel-blue', sku: 'A9001', unit: 'лист' }
  let physical = 18
  const reserve = 0
  const writes = []
  const page = rows => Response.json({ meta: { size: rows.length, limit: 1000, offset: 0 }, rows })
  const fixture = async (input, init) => {
    const url = new URL(input)
    const path = url.pathname.replace('/api/remap/1.2/', '')
    if (path === 'entity/store') {
      assert.equal(init.method, 'GET')
      return page([{ id: storeId, address: 'Москва, Алтуфьевское ш., 37с1', archived: false }])
    }
    if (path === 'entity/assortment') {
      assert.equal(init.method, 'GET')
      return page([{ id: mappedProduct, archived: false, article: 'A9001', meta: { type: 'product' },
        uom: { meta: { type: 'uom', href: 'https://api.moysklad.ru/api/remap/1.2/entity/uom/' + unitId } } }])
    }
    if (path === 'entity/uom') {
      assert.equal(init.method, 'GET')
      return page([{ id: unitId, name: 'лист' }])
    }
    if (path === 'report/stock/bystore/current') {
      assert.equal(init.method, 'GET')
      assert.equal(url.searchParams.get('stockType'), 'stock')
      assert.equal(url.searchParams.get('filter'), 'assortmentId=' + mappedProduct + ';storeId=' + storeId)
      return Response.json([{ assortmentId: mappedProduct, storeId, stock: physical }])
    }
    if (path === 'entity/counterparty' && init.method === 'GET') {
      return Response.json({ rows: [{ id: customerId, meta: { type: 'counterparty' } }] })
    }
    assert.equal(path, 'entity/customerorder')
    assert.equal(init.method, 'POST')
    writes.push(path)
    const order = JSON.parse(init.body)
    assert.equal(order.applicable, false)
    assert.equal(order.positions[0].quantity, 5)
    assert.deepEqual(Object.keys(order.positions[0]).sort(), ['assortment', 'price', 'quantity'])
    assert.equal('reserve' in order, false)
    assert.equal('payments' in order, false)
    assert.equal('demands' in order, false)
    // The isolated provider leaves both warehouse counters intact for this intake order.
    return Response.json({ id: orderId, meta: { type: 'customerorder' }, syncId: order.syncId, applicable: false }, { status: 201 })
  }
  const app = await startTest(t, fixture)
  const reader = createStockReader(config.token, fixture, { minimumIntervalMs: 0 })
  const readQuantity = async () => {
    const { snapshot } = await importInventory({ reader, products: [product], storeId })
    return availabilityFor(parseInventory(snapshot, [product]), product.id).quantity
  }
  assert.equal(await readQuantity(), 18)
  const cart = { ...lead, items: [{ id: product.id, qty: 5 }] }
  assert.equal(await readQuantity(), 18)
  assert.equal((await app.post(cart)).status, 201)
  assert.deepEqual(writes, ['entity/customerorder'])
  assert.equal(reserve, 0)
  assert.equal(physical, 18)
  assert.equal(await readQuantity(), 18)
  physical = 13
  assert.equal(await readQuantity(), 13)
})
