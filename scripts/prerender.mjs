import { stripTypeScriptTypes } from 'node:module'
import assert from 'node:assert/strict'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { loadEnv } from 'vite'
import { seoPageFile, seoPages } from '../src/data/seoRoutes.ts'
import { jsonLd, notFound, renderSeoPage, renderSitemap, renderYml, rootContent } from './seo-static.mjs'

const dist = 'dist'
const rootFile = join(dist, 'index.html')
const index = await readFile(rootFile, 'utf8')
const stylesheet = index.match(/<link rel="stylesheet"[^>]+href="\.\/(assets\/[^"]+\.css)"/)?.[1]
assert(stylesheet, 'Vite stylesheet not found')
assert(index.includes('<div id="root"></div>'), 'Expected a clean Vite application root')
assert.equal(new Set(seoPages.map(page => page.path)).size, seoPages.length, 'Duplicate canonical paths')
assert(seoPages.every(page => /^\/(?:[a-z0-9-]+\/)*$/.test(page.path)), 'Unstable canonical path')
const home = seoPages[0]
assert.equal(home.path, '/')

await copyFile('scripts/seo-pages.css', join(dist, 'seo-pages.css'))
const stockEnabled = loadEnv('production', process.cwd()).VITE_DEKORAY_INVENTORY === '1'
if (stockEnabled) {
  const stockContract = stripTypeScriptTypes(await readFile('src/lib/inventory.ts', 'utf8'))
  const stockClient = await readFile('scripts/seo-stock-client.mjs', 'utf8')
  await writeFile(join(dist, 'seo-stock.js'), stockContract + '\n' + stockClient + '\nstartStock(parseInventory, availabilityFor)\n')
}
for (const page of seoPages.slice(1)) {
  const path = join(dist, seoPageFile(page.path))
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, renderSeoPage(page, stylesheet, stockEnabled))
}
await writeFile(rootFile, index
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, () => jsonLd(home))
  .replace('</head>', '<link rel="stylesheet" href="./seo-pages.css">\n</head>')
  .replace('<div id="root"></div>', () => '<div id="root">' + rootContent(home) + '</div>'))
await writeFile(join(dist, '404.html'), notFound)
await writeFile(join(dist, 'sitemap.xml'), renderSitemap())
const robotsPath = join(dist, 'robots.txt')
const robots = await readFile(robotsPath, 'utf8')
await writeFile(robotsPath, robots.trimEnd() +
  '\n\nUser-agent: Yandex\nAllow: /\nClean-param: utm_source&utm_medium&utm_campaign&utm_content&utm_term&yclid /\n')
await writeFile(join(dist, 'yml.xml'), renderYml())
console.log('Prerendered ' + seoPages.length + ' public HTML documents, sitemap, 404 and price feed.')
