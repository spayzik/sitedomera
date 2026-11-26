import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CONTACTS, collections, products } from '../src/data/products.ts'
import { SEO, metadataForRoute } from '../src/data/seo.ts'
import { readFileSync } from 'node:fs'
import { domainToASCII } from 'node:url'
import { legacyRedirects, canonicalUrl, categoryPath, productPath, seoAssetPrefix, seoPageFile, seoPages, indexableSeoPages } from '../src/data/seoRoutes.ts'
import { previewRobots, renderSitemap } from './seo-static.mjs'
import { renderYml } from './product-feed.mjs'
import { indexNowKey, indexNowPayload } from './indexnow.mjs'

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
  assert.deepEqual([...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map(match => match[1]), indexableSeoPages.map(page => page.lastmod))
  assert.equal(seoPages.find(page => page.path === '/privacy/').lastmod, '2026-11-20')
  assert.equal(seoPages.find(page => page.path === '/catalog/').lastmod, '2026-11-21')
  assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]), indexableSeoPages.map(page => canonicalUrl(page.path)))
})

const htmlFor = path => readFileSync(new URL('../dist/' + seoPageFile(path), import.meta.url), 'utf8')
test('one React storefront emits native content for all direct routes', () => {
  for (const page of seoPages) {
    const html = htmlFor(page.path)
    assert.match(html, /data-path=/)
    assert.equal((html.match(/<h1(?:\s|>)/g) ?? []).length, 1, page.path)
    assert.doesNotMatch(html, /class="seo-static"|data-static-content|seo-home-hero/)
    assert.match(html, /class="site-header/)
    assert.match(html, /class="footer"/)
  }
  assert.match(htmlFor('/'), new RegExp('Каталог</dt><dd>' + products.length + ' позиций · ' + collections.length + ' категорий</dd>'))
  assert.match(htmlFor('/'), new RegExp('manifest-stat-num">' + products.length + '</span><span class="manifest-stat-label">позиций в каталоге'))
  assert.match(htmlFor('/'), /manifest-stat-num">9<\/span><span class="manifest-stat-label">категорий материалов/)
  assert.match(htmlFor('/usloviya-priobreteniya/'), /<h1[^>]*>/)
  const catalog = htmlFor('/catalog/')
  assert.match(catalog, /Коллекций и серий<\/dt><dd>9<\/dd>/)
  assert.equal((catalog.match(/data-catalog-product=/g) ?? []).length, products.length)
  assert.match(catalog, /Ясень серый/)
  assert.match(catalog.replaceAll('<!-- -->', ''), /1[\u00a0\u202f ]913 ₽/)
  assert.match(catalog, /hero-catalog\.webp/)
  assert.match(htmlFor('/kalkulyator/'), /id="calculator-material"/)
})

test('product route contains gallery, confirmed offer, links and calculation for supported goods only', () => {
  const html = htmlFor('/catalog/tkan/a9001/')
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1])['@graph']
  const product = products.find(item => item.sku === 'A9001')
  assert.deepEqual(graph.find(item => item['@type'] === 'Product').offers, {
    '@type': 'Offer', url: canonicalUrl(productPath(product)), priceCurrency: 'RUB', price: product.priceRub,
  })
  assert(graph.some(item => item['@type'] === 'BreadcrumbList'))
  assert.match(html, /kalkulyator\/\?material=pdf2026-p10-r2c1/)
  assert.match(html, /Запросить образец/)
  assert.match(html, /Образец артикула показан отдельно/)
  assert.match(html, /interior-fabric-480\.webp 480w/)
  for (const item of products.filter(item => ['slat', 'profile'].includes(item.kind))) {
    assert(!htmlFor(productPath(item)).includes('/kalkulyator/?material=' + item.id))
  }
})

test('privacy and twelve substantive article routes remain available without JS', () => {
  assert.match(htmlFor('/privacy/'), /<h1>Политика конфиденциальности<\/h1>/)
  assert.match(htmlFor('/privacy/'), /Яндекс\.Метрика/)
  const articles = seoPages.filter(page => page.kind === 'article')
  assert.equal(articles.length, 12)
  for (const route of ['paneli-mdf-pvh', 'montazh-paneley-poshagovo', 'paneli-v-vannoy', 'paneli-pod-kamen-ili-keramogranit', 'kley-dlya-stenovyh-paneley']) {
    const page = articles.find(article => article.path === '/news/' + route + '/')
    assert(page?.copy.blocks.length >= 4, route)
    assert(page.copy.links.length >= 3, route)
  }
  assert.match(htmlFor('/news/kak-rasschitat-paneli/'), /class="reading-layout-example"/)
  assert(articles.every(page => page.path.startsWith('/news/')))
  assert.match(htmlFor('/news/'), /<h1>Статьи<\/h1>/)
  const root = htmlFor('/')
  const preview = root.includes('name="robots" content="' + previewRobots + '"')
  if (preview) assert(!root.includes('rel="canonical"'))
  else assert(root.includes('rel="canonical" href="' + canonicalUrl('/') + '"'))
  for (const { from, to } of legacyRedirects) {
    const redirect = htmlFor(from)
    assert(redirect.includes('0;url=' + seoAssetPrefix(from) + to.slice(1)))
    if (preview) {
      assert(redirect.includes(previewRobots))
      assert(!redirect.includes('rel="canonical"'))
    } else {
      assert(redirect.includes(canonicalUrl(to)))
      assert.match(redirect, /noindex, follow/)
    }
  }
  assert(articles.every(page => page.copy.blocks.length >= 3 && htmlFor(page.path).includes('"@type":"Article"')))
})

test('price feed uses stable ids and verified product facts without inventing stock or business terms', () => {
  const feed = renderYml(new Date('2026-11-20T12:30:00.000Z'))
  assert.match(feed, /<yml_catalog date="2026-11-20 15:30">/)
  const offers = [...feed.matchAll(/<offer id="([a-f0-9]{20})" available="false">/g)].map(match => match[1])
  assert.equal(offers.length, products.length)
  assert.equal(new Set(offers).size, offers.length)
  assert(!/available="true"|<delivery|<pickup|<oldprice>/.test(feed))
  assert.match(feed, /<price>7000<\/price><currencyId>RUR<\/currencyId>/)
  assert.match(feed, /<vendorCode>A9001<\/vendorCode>/)
})


test('selection pages and contact routes keep verified data and shared components', () => {
  for (const thickness of [5, 7, 8]) {
    const path = '/catalog/' + thickness + '-mm/'
    const page = seoPages.find(page => page.path === path)
    assert.deepEqual(page.items, products.filter(product => product.kind === 'panel' && product.thicknessMm === thickness))
    assert.equal((htmlFor(path).match(/data-catalog-product=/g) ?? []).length, page.items.length)
  }
  for (const path of ['/kontakty/', '/showroom/']) {
    const html = htmlFor(path)
    assert(html.includes(CONTACTS.mapOrganization))
    assert(html.includes(CONTACTS.mapWidget.replace('&','&amp;')))
    assert(html.includes(CONTACTS.avito))
    assert(html.includes('Скопировать адрес'))
    assert(html.includes('tel:' + CONTACTS.phoneRaw))
  }
  assert(htmlFor('/otzyvy/').includes('maps-reviews-widget/' + CONTACTS.mapOrganizationId))
})

test('editorial landings contain the presented catalog products without JavaScript', () => {
  for (const [path, expectedNames] of [
    ['/catalog/serye/', ['Ясень серый', 'Серая ёлка', 'Лён светло-серый']],
    ['/catalog/bezhevye/', ['Ясень песочный', 'Лён кремовый', 'Песочный', 'Венецианская, песок']],
    ['/catalog/dlya-tv-zony/', ['Орех дымчатый', '8425-P', 'Рейка, фактура ткань', 'Рейка, металлик']],
    ['/catalog/dlya-spalni/', ['Рогожка белая', 'Лён кремовый', 'Лён светло-серый', 'Песочный']],
  ]) {
    const route = seoPages.find(page => page.path === path)
    assert.ok(route)
    assert.deepEqual(route.items.map(item => item.name), expectedNames)
    assert.equal((htmlFor(path).match(/data-catalog-product=/g) ?? []).length, expectedNames.length)
    assert.match(htmlFor(path), /aria-label="Хлебные крошки"/)
  }
})

test('1220 × 3000 landing publishes every matching panel and excludes other kinds', () => {
  const path = '/catalog/1220x3000/'
  const route = seoPages.find(page => page.path === path)
  assert.equal(route?.kind, 'selection')
  const matching = products.filter(item => item.kind === 'panel' && item.dimensions.widthMm === 1220 && item.dimensions.lengthMm === 3000)
  assert.equal(route.items.length, matching.length)
  for (const name of ['Ясень серый', 'Рогожка белая', 'A9001']) assert(route.items.some(item => item.name === name))
  assert(route.items.every(item => item.kind === 'panel' &&
    item.dimensions.widthMm === 1220 && item.dimensions.lengthMm === 3000))
  const html = htmlFor(path)
  assert.equal((html.match(/data-catalog-product=/g) ?? []).length, matching.length)
  assert.match(html, /aria-label="Хлебные крошки"/)
})

test('all canonical pages have distinct descriptions within the SEO target', () => {
  assert.equal(new Set(seoPages.map(page => page.description)).size, seoPages.length)
  for (const page of indexableSeoPages) assert.ok(page.description.length >= 140 && page.description.length <= 160, page.path)
})

test('IndexNow accepts production canonical paths only and excludes preview ownership files', () => {
  assert.equal(indexNowKey({ VITE_DEKORAY_PREVIEW: '1', DEKORAY_INDEXNOW_KEY: 'synthetic-only' }), undefined)
  assert.equal(indexNowKey({}), undefined)
  assert.throws(() => indexNowKey({ DEKORAY_INDEXNOW_KEY: '../something' }))
  const key = indexNowKey({ DEKORAY_INDEXNOW_KEY: 'synthetic-only' })
  assert.deepEqual(indexNowPayload(key, ['/catalog/', '/catalog/']), {
    host: CONTACTS.hostname, key, urlList: [canonicalUrl('/catalog/')],
  })
  for (const path of ['/catalog/?sort=price-desc', '/#/offer', 'https://spayzik.github.io/dekoray-preview/', '/stati/', '/partners/account/', '/partners/manager/']) {
    assert.throws(() => indexNowPayload(key, [path]))
  }
})
