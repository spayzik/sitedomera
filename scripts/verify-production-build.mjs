import assert from 'node:assert/strict'
import { readFile, readdir, stat } from 'node:fs/promises'
import { extname, join, relative, resolve, sep } from 'node:path'
import ts from 'typescript'
import sharp from 'sharp'
import { CONTACTS } from '../src/data/products.ts'
import { SEO } from '../src/data/seo.ts'

const dist = resolve('dist')
const origin = CONTACTS.origin
const canonical = `${origin}/`
const ogImage = `${origin}/catalog/og-cover.jpg`
const previewBase = 'https://example.github.io/sitedomera/'

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

function localPath(ref, base, siteBase = base) {
  const resolved = new URL(ref, base)
  const root = new URL(siteBase)
  assert.equal(resolved.origin, root.origin, `Unexpected asset origin: ${ref}`)
  assert(resolved.pathname.startsWith(root.pathname), `Asset escapes site base: ${ref}`)
  const path = decodeURIComponent(resolved.pathname.slice(root.pathname.length))
  assert(path && !path.split('/').includes('..'), `Invalid local asset path: ${ref}`)
  return path
}

function productIds(source) {
  const ast = ts.createSourceFile('products.ts', source, ts.ScriptTarget.Latest, true)
  const products = ast.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => [...statement.declarationList.declarations])
    .find((declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === 'products')
  assert(products && ts.isArrayLiteralExpression(products.initializer), 'Product catalog is not a static array')

  const ids = products.initializer.elements.map((element) => {
    assert(ts.isCallExpression(element) && ts.isIdentifier(element.expression) &&
      element.expression.text === 'panel', 'Unexpected product catalog entry')
    const item = element.arguments[0]
    assert(ts.isObjectLiteralExpression(item), 'Product entry must be an object')
    const id = item.properties.find((property) => ts.isPropertyAssignment(property) &&
      ts.isIdentifier(property.name) && property.name.text === 'id')
    assert(id && ts.isStringLiteral(id.initializer), 'Product id must be a string literal')
    return id.initializer.text
  })
  assert(ids.length > 0 && new Set(ids).size === ids.length, 'Product IDs are missing or duplicated')
  return ids
}

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  return (await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name)
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
  assert.equal(namedMeta('robots'), 'index, follow', 'Robots meta mismatch')
  const canonicalLink = one(links.filter((tag) => attribute(tag, 'rel') === 'canonical'), 'canonical link')
  assert.equal(attribute(canonicalLink, 'href'), canonical, 'Canonical URL mismatch')
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
  const business = JSON.parse(jsonLd[1])
  assert.equal(business.url, canonical, 'JSON-LD URL mismatch')
  assert.equal(business.image, ogImage, 'JSON-LD image URL mismatch')

  const robots = await readFile(await requireFile('robots.txt'), 'utf8')
  const sitemap = await readFile(await requireFile('sitemap.xml'), 'utf8')
  assert(/^User-agent:\s*\*$/mi.test(robots) && /^Allow:\s*\/$/mi.test(robots) &&
    !/^Disallow:/mi.test(robots), 'robots.txt must allow the document and assets')
  assert(robots.includes(`Sitemap: ${origin}/sitemap.xml`), 'robots.txt sitemap URL mismatch')
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
  assert.deepEqual(locations, [canonical], 'Sitemap must list only the served canonical document')

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

  const ids = productIds(await readFile(resolve('src/data/products.ts'), 'utf8'))
  for (const base of [canonical, previewBase]) {
    await requireFile(localPath('catalog/hero/hero.webp', base))
    await requireFile(localPath('catalog/hero/hero-catalog.webp', base))
    for (const id of ids) await requireFile(localPath(`catalog/products/${id}.webp`, base))
  }

  const avito = JSON.parse(await readFile(await requireFile('generated/avito-reviews.json'), 'utf8'))
  assert(avito?.source === 'avito' && Array.isArray(avito.reviews), 'Invalid Avito snapshot/fallback')

  const blockedParts = new Set(['.git', '.github', 'node_modules', 'src', 'scripts', 'docs', 'fixtures', 'public'])
  const allowedExtensions = new Set(['.html', '.css', '.js', '.json', '.svg', '.jpg', '.jpeg', '.png', '.webp', '.avif', '.woff2', '.txt', '.xml', '.ico', '.webmanifest'])
  const blockedText = /__SITE_[A-Z_]+__|AVITO_CLIENT_SECRET|AVITO_CLIENT_ID|client_secret|access_token|Authorization:\s*Bearer|api\.telegram\.org\/bot|TELEGRAM_BOT_TOKEN|FTP_PASSWORD|SFTP_PASSWORD|-----BEGIN [^-]*PRIVATE KEY-----|sourceMappingURL|\bdomera\.ru\b|\blocalhost\b|\b127\.0\.0\.1\b|(?:[a-z]:[\\/]Users[\\/]|\/home\/[^/\s]+\/|file:\/\/)/i
  const textExtensions = new Set(['.html', '.css', '.js', '.json', '.txt', '.xml', '.svg'])
  const files = await filesUnder(dist)
  for (const file of files) {
    const path = relative(dist, file).replaceAll('\\', '/')
    const parts = path.toLowerCase().split('/')
    assert(!parts.some((part) => blockedParts.has(part)), `Source/private directory in dist: ${path}`)
    assert(!parts.some((part) => /^\.env(?:\.|$)/.test(part)), `Environment file in dist: ${path}`)
    assert(allowedExtensions.has(extname(path).toLowerCase()), `Unreviewed file type in dist: ${path}`)
    assert(!/\.map$|\.(?:pem|key|p12|pfx)$/i.test(path), `Source map or key file in dist: ${path}`)
    assert(!/(?:secret|credential|password)/i.test(path), `Private-looking file in dist: ${path}`)
    if (textExtensions.has(extname(path).toLowerCase())) {
      assert(!blockedText.test(await readFile(file, 'utf8')), `Private/config marker in dist: ${path}`)
    }
  }
  assert(!files.some((file) => file.toLowerCase().endsWith(`${sep}cname`)), 'GitHub Pages CNAME must not target production')

  console.log(`Production build verified: ${files.length} files, ${ids.length} product images, ${new Set(fontUrls).size} fonts; root and Pages subpath assets resolve.`)
}

verify().catch((error) => {
  console.error(`Production build verification failed: ${error.message}`)
  process.exitCode = 1
})
