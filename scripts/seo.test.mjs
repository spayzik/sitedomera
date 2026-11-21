import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CONTACTS, collections, products } from '../src/data/products.ts'
import { SEO, metadataForRoute } from '../src/data/seo.ts'
import { domainToASCII } from 'node:url'
import { canonicalUrl, categoryPath, productPath, seoAssetPrefix, seoPageFile, seoPages } from '../src/data/seoRoutes.ts'
import { renderSeoPage, renderSitemap, renderYml, rootContent } from './seo-static.mjs'

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

test('public SEO routes resolve the complete price and product inventory, without duplicate or hash paths', () => {
  const paths = seoPages.map(page => page.path)
  assert.equal(new Set(paths).size, paths.length)
  assert(paths.every(path => /^\/(?:[a-z0-9-]+\/)*$/.test(path)))
  assert.equal(seoPages.filter(page => page.kind === 'category').length, collections.length)
  const entries = seoPages.filter(page => page.kind === 'product')
  assert.equal(entries.length, products.length)
  assert.deepEqual(entries.map(page => page.product.id), products.map(product => product.id))
  assert.equal(categoryPath('wood'), '/catalog/derevo/')
  for (const path of ['/opt/', '/dizayneram/', '/otzyvy/', '/o-kompanii/', '/proekty/']) assert(paths.includes(path))
  assert(entries.every(page => page.path === productPath(page.product)))
  assert.equal(seoPageFile('/'), 'index.html')
  assert.equal(seoAssetPrefix(entries[0].path), '../../../')
  const sitemap = renderSitemap()
  assert.deepEqual([...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map(match => match[1]), seoPages.map(page => page.lastmod))
  assert.equal(seoPages.find(page => page.path === '/privacy/').lastmod, '2026-11-20')
  assert.equal(seoPages.find(page => page.path === '/catalog/').lastmod, '2026-11-21')
  assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]), paths.map(canonicalUrl))
})

test('direct pages expose prices, product and breadcrumb schema, canonical navigation and calculator links without JS', () => {
  const stylesheet = 'assets/index-a1b2c3d4.css'
  const wood = seoPages.find(page => page.kind === 'category' && page.categoryId === 'wood')
  const home = rootContent(seoPages[0])
  assert.match(home, /45 позиций · 9 категорий/)
  const category = renderSeoPage(wood, stylesheet)
  assert.match(category, /href="\.\.\/\.\.\/assets\/index-a1b2c3d4\.css"/)
  assert.match(category, /Ясень серый/)
  assert.match(category, /7[\u00a0\u202f ]000 ₽\/шт\./)
  assert.match(category, /1[\u00a0\u202f ]913 ₽\/м²/)
  assert.match(category, /data-catalog-filters data-category-id="wood"/)
  assert.match(category, /data-catalog-list/)
  assert.match(category, /data-catalog-actions="pdf2026-p06-r1c1"/)
  assert(!category.includes('/#/catalog'))
  const product = seoPages.find(page => page.kind === 'product' && page.product.sku === 'A9001')
  const html = renderSeoPage(product, stylesheet)
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1])['@graph']
  const offer = graph.find(item => item['@type'] === 'Product').offers
  assert.deepEqual(offer, { '@type': 'Offer', url: canonicalUrl(product.path), priceCurrency: 'RUB', price: product.product.priceRub })
  assert(graph.some(item => item['@type'] === 'BreadcrumbList'))
  assert.match(html, /href="\.\.\/\.\.\/\.\.\/kalkulyator\/\?material=pdf2026-p10-r2c1"/)
  assert.match(html, /data-product-id="pdf2026-p10-r2c1"/)
  assert.match(html, /href="https:\/\/t\.me\/[^"]+\?text=[^"]*A9001/)
  assert(!html.includes('/#/catalog'))
  for (const page of seoPages.filter(page => page.kind === 'product' && ['profile', 'slat'].includes(page.product.kind))) {
    assert(!renderSeoPage(page, stylesheet).includes('/kalkulyator/?material='), page.path)
  }
})

test('editorial product gallery separates the canonical sample from relevant visualizations', () => {
  const stylesheet = 'assets/index-a1b2c3d4.css'
  const wood = seoPages.find(page => page.kind === 'product' && page.product.categoryId === 'wood')
  const html = renderSeoPage(wood, stylesheet)
  assert.equal([...html.matchAll(/<h1>/g)].length, 1)
  assert(html.includes(wood.product.image))
  const chapter = renderSeoPage(wood, stylesheet, true, null, {
    images: new Map([[wood.product.image, { width: 250, height: 400 }]]),
  })
  assert(chapter.includes('fetchpriority="high" width="250" height="400"'))
  assert(chapter.includes('class="seo-sample seo-image-link" href="../../../' + wood.product.image + '"'))
  assert(chapter.includes('class="seo-image-link" href="../../../catalog/rooms/interior-'))
  assert.match(chapter, /Запросить образец/)
  assert.equal([...html.matchAll(/interior-\w+-480\.webp 480w/g)].length, 2)
  assert.match(html, /Образец артикула показан отдельно/)
  const profile = seoPages.find(page => page.kind === 'product' && page.product.kind === 'profile')
  assert(!renderSeoPage(profile, stylesheet).includes('seo-room-scenes'))
  for (const route of ['/montazh/','/dostavka/','/showroom/','/kontakty/','/proekty/','/opt/','/dizayneram/']) {
    const page = seoPages.find(item => item.path === route)
    assert.equal([...renderSeoPage(page, stylesheet).matchAll(/class="seo-main-action"/g)].length, 1, route)
  }
})

test('the direct privacy document and seven articles are indexed and render meaningful HTML without JS', () => {
  const privacy = seoPages.find(page => page.path === '/privacy/')
  const stylesheet = 'assets/index-a1b2c3d4.css'
  const html = renderSeoPage(privacy, stylesheet)
  assert.match(html, /<h1>Политика конфиденциальности<\/h1>/)
  assert.match(html, /Яндекс\.Метрика/)
  assert.match(html, /href="\.\.\/#\/privacy"/)
  const articles = seoPages.filter(page => page.kind === 'article')
  assert.equal(articles.length, 7)
  assert(articles.every(page => page.copy.blocks.length >= 3 && renderSeoPage(page, stylesheet).includes('"@type":"Article"')))
})

test('price feed uses stable ids and verified product facts without inventing stock or business terms', () => {
  const feed = renderYml(new Date('2026-11-20T12:30:00.000Z'))
  assert.match(feed, /<yml_catalog date="2026-11-20 12:30">/)
  const offers = [...feed.matchAll(/<offer id="([a-f0-9]{20})">/g)].map(match => match[1])
  assert.equal(offers.length, products.length)
  assert.equal(new Set(offers).size, offers.length)
  assert(!/\bavailable=|<delivery|<pickup|<oldprice>/.test(feed))
  assert.match(feed, /<price>7000<\/price><currencyId>RUR<\/currencyId>/)
  assert.match(feed, /<vendorCode>A9001<\/vendorCode>/)
})

test('thickness landing pages contain only confirmed products, correct links and the full snapshot contract', () => {
  for (const thickness of [5, 8]) {
    const page = seoPages.find(page => page.path === '/catalog/' + thickness + '-mm/')
    assert.equal(page.kind, 'selection')
    assert.deepEqual(page.items, products.filter(product => product.kind === 'panel' && product.thicknessMm === thickness))
    const html = renderSeoPage(page, [], true)
    assert(html.includes('Подтверждённые позиции'))
    assert.equal((html.match(/data-stock-id=/g) ?? []).length, page.items.length)
    assert(html.includes('seo-stock.js'))
    assert(html.includes(JSON.stringify(products.map(({id, unit}) => ({id, unit})))))
    assert(!html.includes('"availability"'))
  }
})

test('contact, showroom and reviews use confirmed destinations and graceful no-JS links', () => {
  for (const path of ['/kontakty/', '/showroom/']) {
    const html = renderSeoPage(seoPages.find(page => page.path === path), [])
    assert(html.includes(CONTACTS.mapOrganization))
    assert(html.includes(CONTACTS.mapWidget.replace('&', '&amp;')))
    assert(html.includes(CONTACTS.telegram))
    assert(html.includes(CONTACTS.avito))
    assert(html.includes('hidden data-copy-address'))
    assert(html.includes('tel:' + CONTACTS.phoneRaw))
  }
  const reviews = renderSeoPage(seoPages.find(page => page.path === '/otzyvy/'), [])
  assert(reviews.includes(CONTACTS.avito))
  assert(reviews.includes('data-seo-reviews data-asset-base="../"'))
  assert(reviews.includes('maps-reviews-widget/' + CONTACTS.mapOrganizationId))
})
