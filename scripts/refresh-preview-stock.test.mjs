import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { CONTACTS, products } from '../src/data/products.ts'
import { availabilityFor, parseInventory, stagingInventoryUrl, STOCK_MAX_AGE_MS } from '../src/lib/inventory.ts'
import { refreshPreviewStock } from './refresh-preview-stock.mjs'

const now = Date.parse('2026-11-24T07:15:00.000Z')
const snapshot = updatedAt => ({
  version: 1,
  source: 'moysklad',
  updatedAt: new Date(updatedAt).toISOString(),
  items: products.map(({ id, unit }, index) => index < 2
    ? { id, unit, quantity: index }
    : { id, reason: 'unmapped' }),
})
const respond = raw => async () => Response.json(raw)

test('refreshes a staging input without changing source time; availability expires at its real deadline', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dekoray-preview-stock-'))
  try {
    const path = join(dir, 'inventory-preview.json')
    const raw = snapshot(now - 3000)
    let requested = 0
    const fetchSnapshot = async (url, options) => {
      assert.equal(url, 'https://xn--80ahdrdyo.xn--p1ai/generated/inventory.json')
      assert.equal(options.method, 'GET')
      assert.equal(options.credentials, 'omit')
      assert.equal(options.redirect, 'error')
      requested += 1
      return Response.json(raw)
    }
    assert.equal(await refreshPreviewStock(path, { fetchSnapshot, now: () => now }), true)
    assert.equal(await refreshPreviewStock(path, { fetchSnapshot, now: () => now }), false)
    assert.equal(requested, 2)
    const saved = JSON.parse(await readFile(path, 'utf8'))
    assert.deepEqual(saved, raw)
    const checked = parseInventory(saved, products, now)
    const expires = Date.parse(raw.updatedAt) + STOCK_MAX_AGE_MS
    assert.equal(availabilityFor(checked, products[0].id, expires - 1).status, 'out_of_stock')
    assert.equal(availabilityFor(checked, products[1].id, expires - 1).status, 'in_stock')
    assert.deepEqual(availabilityFor(checked, products[1].id, expires), { status: 'unknown', reason: 'stale' })
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('preserves the previous staging file after stale, older, invalid, or unbounded responses', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dekoray-preview-stock-'))
  try {
    const path = join(dir, 'inventory-preview.json')
    await refreshPreviewStock(path, { fetchSnapshot: respond(snapshot(now - 3000)), now: () => now })
    const before = await readFile(path, 'utf8')
    const invalidUnit = snapshot(now)
    invalidUnit.items[0].unit = 'м'
    const privatePayload = { ...snapshot(now), token: 'fixture-only' }
    const build = (fetchSnapshot) => refreshPreviewStock(path, { fetchSnapshot, now: () => now })
    await assert.rejects(build(respond(snapshot(now - STOCK_MAX_AGE_MS))), /expired/)
    await assert.rejects(build(respond(snapshot(now - 5000))), /older/)
    await assert.rejects(build(respond(invalidUnit)), /quantity or unit/)
    await assert.rejects(build(respond(privatePayload)), /Invalid inventory snapshot/)
    await assert.rejects(build(async () => new Response('<html>Unavailable</html>', { status: 403 })), /unavailable/)
    await assert.rejects(build(async () => Response.json('x'.repeat(32_768))), /size limit/)
    assert.equal(await readFile(path, 'utf8'), before)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('the browser stock URL is staging-only, HTTPS and free of credentials and URL context', () => {
  const path = '/generated/inventory.json'
  const base = 'https://preview-stock.example.org'
  const url = value => stagingInventoryUrl(value, CONTACTS.hostname)
  assert.equal(url(base + path), base + path)
  for (const invalid of [
    CONTACTS.origin + path,
    'https://www.' + CONTACTS.hostname + path,
    CONTACTS.origin + '.' + path,
    'http://preview-stock.example.org' + path,
    base + path + '?secret=fixture',
    base + path + '#fixture',
    'https://fixture@preview-stock.example.org' + path,
    base + '/private.json',
  ]) assert.equal(url(invalid), null, invalid)
})
