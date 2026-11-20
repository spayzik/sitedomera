import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { CONTACTS, products } from '../src/data/products.ts'
import { parseInventory } from '../src/lib/inventory.ts'
import { assertPublicAvitoSnapshot } from './public-avito-snapshot.mjs'

const origin = new URL(CONTACTS.origin)
const compareCandidate = process.argv.includes('--candidate')
const denied = [
  '/docs/DEKORAY-DELIVERY.md', '/requirements/', '/roadmap.md', '/handoff.md',
  '/evidence/', '/screenshots/', '/.env', '/.git/config', '/server/inventory/run.mjs',
  '/src/data/catalog2026.ts', '/catalog/ocr.json', '/catalog/pages/page-01.webp',
  '/catalog/_labels/contact-p22.webp', '/catalog/rooms/coords.json',
  ...process.argv.slice(2).filter(arg => arg !== '--candidate').map(path => {
    assert(/^\/assets\/[A-Za-z0-9_-]+\.js$/.test(path), 'Retired asset must be a local /assets/*.js path')
    return path
  }),
  ...['ТЗ-доработка-сайта.md', 'SEO-стратегия.md', 'тексты-для-сайта.md'].map(path => '/' + encodeURIComponent(path)),
]

async function get(path) {
  try {
    return await fetch(new URL(path, origin), { redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(8_000) })
  } catch {
    throw new Error('HTTPS check failed for ' + path)
  }
}
const hash = bytes => createHash('sha256').update(bytes).digest('hex')

async function verify() {
  const findings = []
  if (compareCandidate) {
    const files = ['index.html', ...(await readdir('dist/assets')).map(file => 'assets/' + file)]
    for (const file of files) {
      const path = file === 'index.html' ? '/' : '/' + file
      const response = await get(path)
      assert(response.ok, 'Candidate asset not available: ' + path)
      const actual = hash(Buffer.from(await response.arrayBuffer()))
      assert.equal(actual, hash(await readFile('dist/' + file)), 'Hosted file differs from candidate: ' + path)
    }
  }
  for (let offset = 0; offset < denied.length; offset += 4) {
    const checks = await Promise.allSettled(denied.slice(offset, offset + 4).map(async path => {
      const response = await get(path)
      await response.body?.cancel()
      assert([403, 404, 410].includes(response.status), 'Expected blocked path ' + path + ', got HTTP ' + response.status)
    }))
    for (const check of checks) if (check.status === 'rejected') findings.push(check.reason.message)
  }
  for (const path of ['/', '/robots.txt', '/sitemap.xml']) {
    const response = await get(path)
    await response.body?.cancel()
    assert(response.ok, 'Required public path ' + path + ' returned HTTP ' + response.status)
  }
  const inventory = await get('/generated/inventory.json')
  assert(inventory.ok && inventory.headers.get('content-type')?.includes('application/json'), 'Inventory JSON unavailable')
  const stock = parseInventory(await inventory.json(), products)
  assert(Date.now() < stock.expiresAt, 'Public inventory snapshot expired')
  const avito = await get('/generated/avito-reviews.json')
  assert(avito.ok && avito.headers.get('content-type')?.includes('application/json'), 'Avito JSON unavailable')
  assertPublicAvitoSnapshot(await avito.json())
  console.log('Public HTML, robots, sitemap and both live snapshots are available.')
  if (findings.length) throw new Error(findings.join('\n'))
  console.log('Hosted boundary verified: ' + denied.length + ' denied paths.')
}
verify().catch(error => {
  console.error('Hosted boundary verification failed: ' + error.message)
  process.exitCode = 1
})
