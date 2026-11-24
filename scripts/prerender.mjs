import assert from 'node:assert/strict'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'vite'
import { indexNowKey, writeIndexNowRelease } from './indexnow.mjs'
import { searchOwnership } from './search-ownership.mjs'
import { optionalPublicReleaseFiles } from '../src/data/publicReleaseFiles.ts'
import { legacyRedirects, seoAssetPrefix, seoPageFile, seoPages } from '../src/data/seoRoutes.ts'
import { jsonLd, previewDocument, renderRoot, renderSeoPage, renderLegacyRedirect, renderSitemap } from './seo-static.mjs'
import { renderYml } from './product-feed.mjs'

const ssrDirectory = resolve('node_modules/.cache/dekoray-ssg')
await build({
  configFile: false,
  esbuild: { jsx: 'automatic' },
  build: { ssr: 'src/ssg.tsx', outDir: ssrDirectory, emptyOutDir: true },
})
const ui = await import(pathToFileURL(join(ssrDirectory, 'ssg.js')).href)
const dist = 'dist'
const preview = process.env.VITE_DEKORAY_PREVIEW === '1'
// Motion's server markup includes the initial state of reveal animations.
const withoutJavaScript = '<noscript><style>main [style^="opacity:0;"],main [style*=";opacity:0;"],main [style$="opacity:0"]{opacity:1!important;transform:none!important}</style></noscript>'
const writeDocument = (path, html) => {
  const document = html.replace('</head>', withoutJavaScript + '</head>')
  return writeFile(path, preview ? previewDocument(document) : document)
}
const ownership = await searchOwnership()
for (const [file, bytes] of ownership.files) await writeFile(join(dist, file), bytes)
const rootFile = join(dist, 'index.html')
const index = await readFile(rootFile, 'utf8')
const manifestPath = join(dist, '.asset-manifest.json')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const entry = manifest['index.html']
assert(entry?.isEntry && entry.file, 'Storefront entry not found')
const css = [...index.matchAll(/<link rel="stylesheet"[^>]+href="\.\/(assets\/[^"]+\.css)"/g)].map(match => match[1])
assert(css.length && index.includes('<div id="root"></div>'), 'Missing storefront styles or mount')
await unlink(manifestPath)
assert.equal(new Set(seoPages.map(page => page.path)).size, seoPages.length, 'Duplicate canonical paths')

const assets = { file: entry.file, css }
for (const page of seoPages.slice(1)) {
  const path = join(dist, seoPageFile(page.path))
  await mkdir(dirname(path), { recursive: true })
  await writeDocument(path, renderSeoPage(page, seoAssetPrefix(page.path), assets, ui))
}
for (const { from, to } of legacyRedirects) {
  const path = join(dist, seoPageFile(from))
  await mkdir(dirname(path), { recursive: true })
  await writeDocument(path, renderLegacyRedirect(from, to))
}
await writeDocument(rootFile, index
  .replace('</head>', () => ownership.tags.join('') + '</head>')
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, () => jsonLd(seoPages[0]))
  .replace('<div id="root"></div>', () => renderRoot('/', './', ui)))
await writeDocument(join(dist, '404.html'), renderSeoPage(null, preview ? '/dekoray-preview/' : '/', assets, ui))
if (preview) {
  for (const file of optionalPublicReleaseFiles) {
    const path = join(dist, file)
    const html = await readFile(path, 'utf8').catch(error => {
      if (error.code !== 'ENOENT') throw error
    })
    if (html !== undefined) await writeDocument(path, html)
  }
}
const key = indexNowKey({ ...process.env, VITE_DEKORAY_PREVIEW: preview ? '1' : '0' })
if (key) {
  await writeFile(join(dist, key + '.txt'), key + '\n')
  await writeIndexNowRelease(dist)
}
await writeFile(join(dist, 'sitemap.xml'), renderSitemap())
const robotsPath = join(dist, 'robots.txt')
const robots = await readFile(robotsPath, 'utf8')
await writeFile(robotsPath, preview ? 'User-agent: *\nAllow: /\n' : robots)
const epoch = process.env.SOURCE_DATE_EPOCH
assert(epoch === undefined || (/^\d+$/.test(epoch) && Number.isFinite(new Date(Number(epoch) * 1000).valueOf())), 'Invalid SOURCE_DATE_EPOCH')
const feedDate = epoch === undefined ? new Date() : new Date(Number(epoch) * 1000)
await writeFile(join(dist, 'yml.xml'), renderYml(feedDate, { channel: 'search' }))
await writeFile(join(dist, 'yml-direct.xml'), renderYml(feedDate))
console.log('Prerendered ' + seoPages.length + ' React routes, sitemap, 404 and YML fallbacks.')
