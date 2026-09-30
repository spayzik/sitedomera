import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CONTACTS } from '../src/data/products.ts'
import { SEO, metadataForRoute } from '../src/data/seo.ts'

test('home metadata names the product and brand', () => {
  assert.equal(metadataForRoute('/'), SEO.home)
  assert.match(SEO.home.title, /бамбуковые стеновые панели/i)
  assert.match(SEO.home.title, new RegExp(CONTACTS.brand))
})

test('hash page views have distinct client-side metadata', () => {
  assert.equal(metadataForRoute('/catalog'), SEO.catalog)
  assert.equal(metadataForRoute('/privacy'), SEO.privacy)
  assert.equal(metadataForRoute('/offer'), SEO.offer)
  assert.equal(SEO.catalog.title, `Каталог бамбуковых стеновых панелей — ${CONTACTS.brand}`)
  assert.equal(SEO.privacy.title, `Политика конфиденциальности — ${CONTACTS.brand}`)
  assert.equal(SEO.offer.title, `Условия приобретения — ${CONTACTS.brand}`)
})

test('unknown and section hashes retain the home document metadata', () => {
  assert.equal(metadataForRoute('/something-invalid'), SEO.home)
  assert.equal(metadataForRoute('showroom'), SEO.home)
})
