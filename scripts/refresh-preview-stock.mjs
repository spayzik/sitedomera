import { readFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { CONTACTS, products } from '../src/data/products.ts'
import { parseInventory } from '../src/lib/inventory.ts'
import { publishSnapshot } from '../server/inventory/sync.mjs'

const source = CONTACTS.origin + '/generated/inventory.json'
const maxBytes = 32_768

async function readPublicSnapshot(response) {
  const type = response.headers.get('content-type') ?? ''
  if (response.status !== 200 || !/^application\/json(?:\s*;|\s*$)/i.test(type) || !response.body) {
    throw new Error('Public inventory snapshot is unavailable')
  }
  const reader = response.body.getReader()
  const chunks = []
  let bytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > maxBytes) throw new Error('Public inventory snapshot exceeds size limit')
      chunks.push(Buffer.from(value))
    }
  } finally {
    await reader.cancel().catch(() => {})
  }

  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)))
  } catch {
    throw new Error('Malformed public inventory snapshot')
  }
}

export async function refreshPreviewStock(path, { fetchSnapshot = fetch, now = Date.now } = {}) {
  // This command writes a staging input. The release build owns the actual webroot.
  if (basename(path) !== 'inventory-preview.json') throw new Error('Use inventory-preview.json as the staging input filename')
  const response = await fetchSnapshot(source, {
    method: 'GET',
    credentials: 'omit',
    redirect: 'error',
    headers: { accept: 'application/json', 'cache-control': 'no-cache' },
    signal: AbortSignal.timeout(10_000),
  })
  const raw = await readPublicSnapshot(response)
  const currentTime = now()
  const checked = parseInventory(raw, products, currentTime)
  if (checked.expiresAt <= currentTime) throw new Error('Public inventory snapshot has expired')

  const previous = await readFile(path, 'utf8').catch(error => {
    if (error.code !== 'ENOENT') throw error
    return null
  })
  if (previous !== null) {
    const cached = parseInventory(JSON.parse(previous), products, currentTime)
    if (cached.updatedAt > checked.updatedAt) throw new Error('Public inventory snapshot is older than staging input')
    if (cached.updatedAt === checked.updatedAt) return false
  }
  await publishSnapshot(path, raw, products, currentTime)
  return true
}

if (import.meta.main) {
  const [path] = process.argv.slice(2)
  if (!path || process.argv.length !== 3) {
    console.error('Usage: node scripts/refresh-preview-stock.mjs <staging directory>/inventory-preview.json')
    process.exitCode = 1
  } else {
    try {
      const changed = await refreshPreviewStock(resolve(path))
      console.log(changed ? 'Staging inventory input refreshed' : 'Staging inventory input is already current')
    } catch (error) {
      console.error('Staging inventory refresh rejected:', error instanceof Error ? error.message : 'unavailable')
      process.exitCode = 1
    }
  }
}
