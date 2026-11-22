import assert from 'node:assert/strict'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'vite'
import { legacyNewsRedirects, seoAssetPrefix, seoPageFile, seoPages } from '../src/data/seoRoutes.ts'
import { jsonLd, renderRoot, renderSeoPage, renderNewsRedirect, renderSitemap, renderYml } from './seo-static.mjs'

const ssrDirectory = resolve('node_modules/.cache/dekoray-ssg')
await build({
  configFile: false,
  esbuild: { jsx: 'automatic' },
  build: { ssr: 'src/ssg.tsx', outDir: ssrDirectory, emptyOutDir: true },
})
const ui = await import(pathToFileURL(join(ssrDirectory, 'ssg.js')).href)
const dist = 'dist'
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
  await writeFile(path, renderSeoPage(page, seoAssetPrefix(page.path), assets, ui))
}
for (const { from, to } of legacyNewsRedirects) {
  const path = join(dist, seoPageFile(from))
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, renderNewsRedirect(from, to))
}
await writeFile(rootFile, index
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, () => jsonLd(seoPages[0]))
  .replace('<div id="root"></div>', () => renderRoot('/', './', ui)))
await writeFile(join(dist, '404.html'), renderSeoPage(null, process.env.DEKORAY_404_BASE || '/', assets, ui))
await writeFile(join(dist, 'sitemap.xml'), renderSitemap())
const robotsPath = join(dist, 'robots.txt')
const robots = await readFile(robotsPath, 'utf8')
await writeFile(robotsPath, robots.trimEnd() +
  '\n\nUser-agent: Yandex\nAllow: /\nClean-param: utm_source&utm_medium&utm_campaign&utm_content&utm_term&yclid /\n')
await writeFile(join(dist, 'yml.xml'), renderYml())
console.log('Prerendered ' + seoPages.length + ' React routes, sitemap, 404 and price feed.')
