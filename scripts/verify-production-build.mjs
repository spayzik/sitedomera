import assert from 'node:assert/strict'
import { readFile, readdir, stat } from 'node:fs/promises'
import { extname, join, relative, resolve, sep } from 'node:path'
import sharp from 'sharp'
import { CONTACTS, products, sourceInventory } from '../src/data/products.ts'
import { SEO } from '../src/data/seo.ts'
import { legacyRedirects, canonicalUrl, seoPageFile, seoPages } from '../src/data/seoRoutes.ts'
import { escape, previewRobots } from './seo-static.mjs'
import { indexNowKey } from './indexnow.mjs'
import { parseInventory } from '../src/lib/inventory.ts'
import { publicReleaseFiles, optionalPublicReleaseFiles } from '../src/data/publicReleaseFiles.ts'
import { assertPublicAvitoSnapshot } from './public-avito-snapshot.mjs'

const dist = resolve('dist')
const origin = CONTACTS.origin
const canonical = `${origin}/`
const ogImage = `${origin}/catalog/og-cover.jpg`
const previewBase = 'https://spayzik.github.io/dekoray-preview/'
const preview = process.env.VITE_DEKORAY_PREVIEW === '1'
const robotsMeta = preview ? previewRobots : 'index, follow'
const excludedMeta = preview ? previewRobots : 'noindex, follow'

async function requireFile(path) {
  const target = resolve(dist, path)
  assert(target.startsWith(`${dist}${sep}`), `Path escapes dist: ${path}`)
  assert((await stat(target)).isFile(), `Missing dist file: ${path}`)
  return target
}

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((match) => match[0])
}

function attribute(tag, name) {
  return tag.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`, 'i'))?.[1]
}

function one(items, description) {
  assert.equal(items.length, 1, `Expected one ${description}, found ${items.length}`)
  return items[0]
}

function checkCanonical(links, expected, label) {
  const canonicals = links.filter(tag => attribute(tag, 'rel') === 'canonical')
  if (preview) assert.equal(canonicals.length, 0, label + ' preview canonical')
  else assert.equal(attribute(one(canonicals, label + ' canonical'), 'href'), expected)
}

function checkNoLegacyLinks(document, label) {
  for (const tag of tags(document, 'a')) {
    const href = attribute(tag, 'href')
    assert(!href?.includes('#/'), label + ' links to legacy hash route')
  }
}

function localPath(ref, base, siteBase = base) {
  const resolved = new URL(ref, base)
  const root = new URL(siteBase)
  assert.equal(resolved.origin, root.origin, `Unexpected asset origin: ${ref}`)
  assert(resolved.pathname.startsWith(root.pathname), `Asset escapes site base: ${ref}`)
  const path = decodeURIComponent(resolved.pathname.slice(root.pathname.length))
  assert(path && !path.split('/').includes('..'), `Invalid local asset path: ${ref}`)
  return path
}

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  return (await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name)
    assert(entry.isDirectory() || entry.isFile(), 'Unsupported public filesystem entry: ' + relative(dist, path))
    return entry.isDirectory() ? filesUnder(path) : [path]
  }))).flat()
}

async function verify() {
  const html = await readFile(await requireFile('index.html'), 'utf8')
  assert(!/__SITE_[A-Z_]+__/.test(html), 'Unresolved site metadata marker')
  assert.equal(attribute(one(tags(html, 'html'), 'html element'), 'lang'), 'ru', 'HTML language mismatch')
  const title = one([...html.matchAll(/<title>([\s\S]*?)<\/title>/gi)], 'title')[1]
  assert.equal(title, SEO.home.title, 'Static title mismatch')

  const links = tags(html, 'link')
  const metas = tags(html, 'meta')
  const namedMeta = (name) => attribute(one(metas.filter((tag) => attribute(tag, 'name') === name), name), 'content')
  assert.equal(namedMeta('description'), SEO.home.description, 'Static description mismatch')
  assert.equal(namedMeta('robots'), robotsMeta, 'Robots meta mismatch')
  checkCanonical(links, canonical, 'Home')
  const meta = (property) => attribute(one(metas.filter((tag) => attribute(tag, 'property') === property), property), 'content')
  assert.equal(meta('og:type'), 'website', 'Open Graph type mismatch')
  assert.equal(meta('og:locale'), 'ru_RU', 'Open Graph locale mismatch')
  assert.equal(meta('og:site_name'), CONTACTS.brand, 'Open Graph site name mismatch')
  assert.equal(meta('og:title'), SEO.home.title, 'Open Graph title mismatch')
  assert.equal(meta('og:description'), SEO.home.description, 'Open Graph description mismatch')
  assert.equal(meta('og:url'), canonical, 'Open Graph URL mismatch')
  assert.equal(meta('og:image'), ogImage, 'Open Graph image URL mismatch')
  const image = await sharp(await requireFile('catalog/og-cover.jpg')).metadata()
  assert.equal(Number(meta('og:image:width')), image.width, 'Open Graph image width mismatch')
  assert.equal(Number(meta('og:image:height')), image.height, 'Open Graph image height mismatch')
  assert.equal(namedMeta('twitter:card'), 'summary_large_image', 'Social card mismatch')
  assert.equal(namedMeta('twitter:title'), SEO.home.title, 'Social title mismatch')
  assert.equal(namedMeta('twitter:description'), SEO.home.description, 'Social description mismatch')
  assert.equal(namedMeta('twitter:image'), ogImage, 'Social image mismatch')

  const jsonLd = one([...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)], 'JSON-LD script')
  const graph = JSON.parse(jsonLd[1])['@graph']
  const business = graph.find(item => item['@type'] === 'LocalBusiness')
  assert.equal(business?.url, canonical, 'JSON-LD URL mismatch')
  assert.equal(business.image, ogImage, 'JSON-LD image URL mismatch')
  assert.equal(tags(html, 'h1').length, 1, 'Home must have one server-rendered H1')
  checkNoLegacyLinks(html, 'Home')
  assert.match(html, /Каталог<\/dt><dd>45 позиций · 9 категорий<\/dd>/)
  assert.match(await readFile(await requireFile('catalog/index.html'), 'utf8'), /Коллекций и серий<\/dt><dd>9<\/dd>/)

  const robots = await readFile(await requireFile('robots.txt'), 'utf8')
  const sitemap = await readFile(await requireFile('sitemap.xml'), 'utf8')
  assert(/^User-agent:\s*\*$/mi.test(robots) && /^Allow:\s*\/$/mi.test(robots), 'robots.txt must allow canonical documents and public assets')
  if (preview) assert(!/^Sitemap:|^Disallow:/mi.test(robots), 'Preview must let bots see the noindex meta without advertising a sitemap')
  else assert(robots.includes(`Sitemap: ${origin}/sitemap.xml`), 'robots.txt sitemap URL mismatch')
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
  assert.deepEqual(locations, seoPages.map(page => canonicalUrl(page.path)), 'Sitemap must list exactly the generated pages')
  const lastmod = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map(match => match[1])
  assert.deepEqual(lastmod, seoPages.map(page => page.lastmod), 'Sitemap modification dates must match content revisions')
  const publicPaths = new Set(seoPages.map(page => page.path))
  const titles = new Set([title])
  const descriptions = new Set([namedMeta('description')])
  for (const page of seoPages.slice(1)) {
    const file = seoPageFile(page.path)
    const document = await readFile(await requireFile(file), 'utf8')
    const pageTitle = one([...document.matchAll(/<title>([^<]*)<\/title>/gi)], file + ' title')[1]
    assert.equal(pageTitle, escape(page.title), file + ' title mismatch')
    assert(!titles.has(pageTitle), file + ' duplicate title')
    titles.add(pageTitle)
    const pageMeta = tags(document, 'meta')
    const metaValue = (key, value) => attribute(one(pageMeta.filter(tag => attribute(tag, key) === value), file + ' ' + value), 'content')
    const description = metaValue('name', 'description')
    assert.equal(description, escape(page.description), file + ' description mismatch')
    assert(!descriptions.has(description), file + ' duplicate description')
    descriptions.add(description)
    assert.equal(metaValue('name', 'robots'), robotsMeta)
    assert.equal(metaValue('property', 'og:url'), canonicalUrl(page.path))
    await requireFile(localPath(metaValue('property', 'og:image'), canonical))
    const documentLinks = tags(document, 'link')
    checkCanonical(documentLinks, canonicalUrl(page.path), file)
    checkNoLegacyLinks(document, file)
    assert.equal(tags(document, 'h1').length, 1, file + ' must have one server-rendered H1')
    assert.match(document, /<main\b[^>]*>[\s\S]*<\/main>/i)
    const scripts = tags(document, 'script').filter(tag => attribute(tag, 'src'))
    one(scripts.filter(tag => /\/assets\/index-[\w-]+\.js$/.test(attribute(tag, 'src'))), file + ' shared storefront entry')
    assert.match(document, /id="root" data-path=/)
    assert.doesNotMatch(document, /data-static-content|class="seo-static"/)
    for (const image of [...tags(document, 'img'), ...tags(document, 'source')]) {
      for (const candidate of (attribute(image, 'srcset') ?? '').split(',').map(source => source.trim().split(/\s+/)[0]).filter(Boolean)) {
        for (const base of [canonical, previewBase]) await requireFile(localPath(candidate, new URL(page.path.slice(1), base), base))
      }
    }
    for (const rel of [...documentLinks.filter(tag => ['stylesheet', 'icon'].includes(attribute(tag, 'rel'))),
      ...tags(document, 'img'), ...scripts]) {
      const asset = attribute(rel, 'href') ?? attribute(rel, 'src')
      for (const base of [canonical, previewBase]) {
        await requireFile(localPath(asset, new URL(page.path.slice(1), base), base))
      }
    }
    for (const tag of tags(document, 'a')) {
      const href = attribute(tag, 'href')
      if (!href || !href.startsWith('.')) continue
      const target = new URL(href, canonicalUrl(page.path))
      const asset = target.pathname.slice(1)
      if (page.kind === 'product' && publicReleaseFiles.has(asset) && /\.webp$/.test(asset)) {
        assert(page.kind === 'product' && /\.webp$/.test(asset) && publicReleaseFiles.has(asset), file + ' links to unapproved gallery image: ' + asset)
        for (const base of [canonical, previewBase]) await requireFile(localPath(href, new URL(page.path.slice(1), base), base))
      } else {
        assert(publicPaths.has(target.pathname), file + ' links to missing public page: ' + target.pathname)
      }
    }
    if (page.kind === 'product') {
      const product = page.product
      assert(document.includes('Добавить в подборку'), file + ' is missing product tools')
      const payload = one([...document.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)], file + ' JSON-LD')[1]
      const record = JSON.parse(payload)['@graph'].find(item => item['@type'] === 'Product')
      assert.equal(record?.name, product.name, file + ' schema product mismatch')
      assert.equal(record.offers.price, product.priceRub)
      assert.equal(record.offers.priceCurrency, 'RUB')
      assert(!Object.hasOwn(record.offers, 'availability'), file + ' static availability cannot be assumed')
    }
  }
  const feed = await readFile(await requireFile('yml.xml'), 'utf8')
  assert.equal([...feed.matchAll(/<offer id="/g)].length, products.length, 'Feed must match the published catalog')
  assert(!/\bavailable=/.test(feed), 'Feed includes unverified inventory')
  const missingPage = await readFile(await requireFile('404.html'), 'utf8')
  assert(missingPage.includes('name="robots" content="' + excludedMeta + '"'), '404 must not be indexed')
  for (const { from, to } of legacyRedirects) {
    const alias = await readFile(await requireFile(seoPageFile(from)), 'utf8')
    assert(alias.includes('name="robots" content="' + excludedMeta + '"'), from + ' must not be indexed')
    const location = attribute(one(tags(alias, 'meta').filter(tag => attribute(tag, 'http-equiv') === 'refresh'), from + ' redirect'), 'content')
    for (const base of [canonical, previewBase]) {
      const ref = new URL(location.replace(/^0;url=/, ''), new URL(from.slice(1), base))
      assert.equal(ref.href, new URL(to.slice(1), base).href, from + ' redirect target')
    }
    checkCanonical(tags(alias, 'link'), canonicalUrl(to), from)
  }

  const assetLinks = links.filter((tag) => ['icon', 'preload', 'modulepreload', 'stylesheet'].includes(attribute(tag, 'rel')))
    .map((tag) => attribute(tag, 'href'))
  const scriptSources = tags(html, 'script').map((tag) => attribute(tag, 'src')).filter(Boolean)
  const localRefs = [...assetLinks, ...scriptSources]
  assert(localRefs.length > 0 && localRefs.every((ref) => ref.startsWith('./')), 'HTML assets must use Vite relative base paths')
  for (const base of [canonical, previewBase]) {
    for (const ref of localRefs) await requireFile(localPath(ref, base))
    await requireFile(localPath('generated/avito-reviews.json', base))
  }

  const fontLink = one(assetLinks.filter((ref) => ref.endsWith('/fonts/fonts.css')), 'font stylesheet')
  const fontCss = await readFile(await requireFile(localPath(fontLink, canonical)), 'utf8')
  const fontUrls = [...fontCss.matchAll(/url\(['"]?([^)'"\s]+\.woff2)['"]?\)/g)].map((match) => match[1])
  assert(fontUrls.length > 0, 'No local font URLs found')
  for (const fontUrl of fontUrls) {
    for (const base of [canonical, previewBase]) {
      const cssUrl = new URL(fontLink, base)
      await requireFile(localPath(fontUrl, cssUrl, base))
    }
  }

  assert.equal(sourceInventory.length, 46, 'Source inventory count mismatch')
  assert(products.length > 0 && new Set(products.map(p => p.id)).size === products.length, 'Missing/duplicate published product IDs')
  for (const p of products) {
    const source = sourceInventory.find(item => item.id === p.id)
    assert(source?.status === 'verified' && source.image === p.image, 'Product lacks verified source/image mapping: ' + p.id)
    assert(Number.isFinite(p.priceRub) && p.priceRub > 0 && p.priceRub === source.priceRub, 'Invalid product price: ' + p.id)
  }
  for (const base of [canonical, previewBase]) {
    await requireFile(localPath('catalog/hero/hero.webp', base))
    await requireFile(localPath('catalog/hero/hero-catalog.webp', base))
    await requireFile(localPath('catalog/rooms/montage.webp', base))
    for (const p of products) await requireFile(localPath(p.image, base))
  }

  const avito = JSON.parse(await readFile(await requireFile('generated/avito-reviews.json'), 'utf8'))
  assertPublicAvitoSnapshot(avito, { allowFallback: true })

  const required = new Set(['404.html', 'yml.xml', ...seoPages.map(page => seoPageFile(page.path)), ...legacyRedirects.map(({ from }) => seoPageFile(from)), ...publicReleaseFiles])
  const key = indexNowKey()
  if (key) {
    const keyFile = key + '.txt'
    required.add(keyFile)
    assert.equal((await readFile(await requireFile(keyFile), 'utf8')).trim(), key)
  }
  for (const path of required) await requireFile(path)
  const internalNames = /(?:^|[/_.-])(?:requirements?|roadmap|handoff|evidence|screenshots?|private|internal|codex|debug|fixtures?|test|spec|backup|manifest)(?:[/_.-]|$)/i
  const blockedText = /__SITE_[A-Z_]+__|AVITO_CLIENT_(?:SECRET|ID)|client_secret|access_token|Authorization:\s*Bearer|api\.telegram\.org\/bot|TELEGRAM_BOT_TOKEN|(?:S?FTP|REG(?:RU)?)[_ -]?(?:PASSWORD|TOKEN)|-----BEGIN [^-]*PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|(?:AKIA|ASIA)[A-Z0-9]{16}|sourceMappingURL|\bdomera\.ru\b|\blocalhost\b|\b127\.0\.0\.1\b|(?:[a-z]:[\\/]Users[\\/]|\/home\/[^/\s]+\/|file:\/\/)/i
  const integration = /MOYSKLAD_(?:API_TOKEN|STORE_ID)|api\.moysklad\.ru|api\.avito\.ru|\.dekoray-inventory|\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b|(?:privateManifest|moyskladId|warehouseId|identityEvidence|imageEvidence|previewCrop|skuReview|pdfPage)\s*["']?\s*:/i
  const internalText = /(?:ТЗ-доработка-сайта|SEO-стратегия\.md|тексты-для-сайта\.md|AGENTS\.md|SKILL\.md|DEKORAY-DELIVERY\.md|DESIGN-17S-CATEGORY-IMAGES\.md|begin (?:system|developer) prompt|(?:codex|ai)\s+(?:handoff|transcript|prompt)|private mapping manifest|owner_review_required)/i
  const textExtensions = new Set(['.html', '.css', '.js', '.json', '.txt', '.xml', '.svg'])
  const files = await filesUnder(dist)
  const inventoryPath = 'generated/inventory.json'
  if (files.some(file => relative(dist, file).replaceAll('\\', '/') === inventoryPath)) {
    assert(preview, 'Inventory snapshots can only be embedded in a staging build')
    parseInventory(JSON.parse(await readFile(await requireFile(inventoryPath), 'utf8')), products)
    required.add(inventoryPath)
  }
  const reachableAssets = new Set()
  const references = /(?:assets\/|\.\/)([A-Za-z0-9][A-Za-z0-9._-]*-[A-Za-z0-9_-]{8}\.(?:js|css))(?![A-Za-z0-9_.-])/g
  const collect = text => {
    for (const match of text.matchAll(references)) {
      const path = 'assets/' + match[1]
      reachableAssets.add(path)
    }
  }
  collect(html)
  for (const page of seoPages.slice(1)) collect(await readFile(await requireFile(seoPageFile(page.path)), 'utf8'))
  for (const path of reachableAssets) collect(await readFile(await requireFile(path), 'utf8'))
  for (const file of files) {
    const path = relative(dist, file).replaceAll('\\', '/')
    assert(required.has(path) || optionalPublicReleaseFiles.has(path) || reachableAssets.has(path), 'Unapproved public path: ' + path)
    assert(!internalNames.test(path), 'Internal artifact name: ' + path)
    const extension = extname(path)
    const bytes = await readFile(file)
    if (textExtensions.has(extension)) {
      const content = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      if (preview && extension === '.html') {
        const robots = tags(content, 'meta').filter(tag => attribute(tag, 'name') === 'robots')
        assert.equal(attribute(one(robots, path + ' robots'), 'content'), previewRobots)
        checkCanonical(tags(content, 'link'), null, path)
      }
      assert(!blockedText.test(content), 'Private/config marker in dist: ' + path)
      assert(!/домэра|xn--80ahyhl1f/i.test(content), 'Previous public brand in dist: ' + path)
      assert(!integration.test(content), 'Private integration marker in dist: ' + path)
      assert(!internalText.test(content), 'Internal work marker in dist: ' + path)
    } else {
      const magic = bytes.subarray(0, 12).toString('ascii')
      const valid = extension === '.webp' ? magic.startsWith('RIFF') && magic.endsWith('WEBP')
        : extension === '.jpg' ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
          : extension === '.woff2' && magic.startsWith('wOF2')
      assert(valid, 'Invalid public binary type: ' + path)
    }
  }

  console.log(`${preview ? 'Staging' : 'Production'} build verified: ${files.length} files, ${products.length} mapped product images, ${new Set(fontUrls).size} fonts; root and Pages subpath assets resolve.`)
}

verify().catch((error) => {
  console.error(`Production build verification failed: ${error.message}`)
  process.exitCode = 1
})
