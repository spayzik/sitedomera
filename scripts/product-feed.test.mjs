import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { products } from '../src/data/products.ts'
import { feedOfferId } from '../src/data/feedOfferIds.ts'
import { renderYml } from './product-feed.mjs'

const now = new Date('2026-11-24T09:00:00.000Z')
const verifiedPhoto = products.find(product => product.sku === '671-A227')
const smallPhoto = products.find(product => product.sku === 'A9001')
const commerce = { legalName: 'Тестовый продавец', delivery: false, pickup: true }
const saleable = new Set([verifiedPhoto.id, smallPhoto.id])

test('Direct always declares availability and preserves the existing offer IDs and catalog facts', () => {
  const direct = renderYml(now, { saleable, commerce })
  assert.match(direct, /date="2026-11-24 12:00"/)
  assert.equal((direct.match(/<offer id=/g) ?? []).length, products.length)
  assert.equal((direct.match(/available="true"/g) ?? []).length, 2)
  for (const product of products) {
    const id = createHash('sha256').update(product.id).digest('hex').slice(0, 20)
    assert.equal(feedOfferId(product.id), id)
    assert(direct.includes(`<offer id="${id}" available="${saleable.has(product.id)}">`))
  }
  assert.match(direct, /<vendorCode>671-A227<\/vendorCode>/)
  assert.match(direct, /<price>7000<\/price><currencyId>RUR<\/currencyId>/)
  assert.equal(feedOfferId('unknown'), undefined)
})

test('Product Search only includes purchasable offers with qualifying product images and RFC 3339 dates', () => {
  const search = renderYml(now, { channel: 'search', saleable, commerce })
  assert.match(search, /date="2026-11-24T09:00:00Z"/)
  assert.match(search, /<company>Тестовый продавец<\/company>/)
  assert.match(search, /<delivery>false<\/delivery><pickup>true<\/pickup>/)
  assert.deepEqual([...search.matchAll(/<offer id="([^"\n]+)" available="true">/g)].map(match => match[1]), [feedOfferId(verifiedPhoto.id)])
  assert.doesNotMatch(renderYml(now, { channel: 'search' }), /<offer id=/)
  assert.doesNotMatch(renderYml(now, { saleable }), /available="true"/)
})
