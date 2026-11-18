import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CONTACTS } from '../src/data/products.ts'
import { SEO, metadataForRoute } from '../src/data/seo.ts'
import { domainToASCII } from 'node:url'

test('launch uses the owner-provided brand and IDN hostname', () => {
  assert.equal(CONTACTS.brand, 'ДЕКОРАЙ')
  assert.equal(CONTACTS.site, 'декорай.рф')
  assert.equal(CONTACTS.hostname, domainToASCII('декорай.рф'))
  assert.equal(CONTACTS.origin, 'https://xn--80ahdrdyo.xn--p1ai')
})

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
