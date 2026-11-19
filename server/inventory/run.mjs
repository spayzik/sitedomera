import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { readFile, realpath } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { products } from '../../src/data/products.ts'
import { createStockReader, InventoryError, isUuid, STOCK_ENDPOINT } from './moysklad.mjs'
import { importInventory, publishSnapshot, savePrivateManifest } from './sync.mjs'

function requiredPath(name) {
  const value = process.env[name]
  if (!value || !isAbsolute(value)) throw new InventoryError('CONFIG_HOLD', { variable: name })
  return resolve(value)
}

function isWithin(root, candidate) {
  const rel = relative(root, candidate)
  return !isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + sep)
}

async function privatePath(name, webroot, exists) {
  if (!process.env[name]) return undefined
  const file = requiredPath(name)
  const directory = await realpath(dirname(file))
  const target = exists ? await realpath(file) : resolve(directory, relative(dirname(file), file))
  const repository = await realpath(fileURLToPath(new URL('../..', import.meta.url)))
  if ([webroot, repository].some(root => isWithin(root, directory) || isWithin(root, target))) {
    throw new InventoryError('CONFIG_HOLD', { variable: name })
  }
  return target
}

async function main() {
  const action = process.argv[2]
  if (!['preflight', 'publish'].includes(action) || process.argv.length !== 3) throw new InventoryError('USAGE')
  const reader = createStockReader(process.env.MOYSKLAD_API_TOKEN)
  const storeId = process.env.MOYSKLAD_STORE_ID
  if ((storeId && !isUuid(storeId)) || (action === 'publish' && !storeId)) {
    throw new InventoryError('STORE_SELECTION_HOLD')
  }
  const needsWebroot = action === 'publish' || process.env.DEKORAY_INVENTORY_MAP_FILE || process.env.DEKORAY_INVENTORY_MANIFEST_FILE
  const webroot = needsWebroot ? await realpath(requiredPath('DEKORAY_INVENTORY_WEBROOT')) : undefined
  const generated = action === 'publish' ? await realpath(resolve(webroot, 'generated')) : undefined
  if (generated && !isWithin(webroot, generated)) throw new InventoryError('CONFIG_HOLD', { variable: 'DEKORAY_INVENTORY_WEBROOT' })
  const mapPath = await privatePath('DEKORAY_INVENTORY_MAP_FILE', webroot, true)
  const manifestPath = await privatePath('DEKORAY_INVENTORY_MANIFEST_FILE', webroot, false)
  if (manifestPath && manifestPath === mapPath) throw new InventoryError('CONFIG_HOLD', { variable: 'DEKORAY_INVENTORY_MANIFEST_FILE' })
  const manual = mapPath ? JSON.parse(await readFile(mapPath, 'utf8')) : {}
  const { snapshot, manifest, summary } = await importInventory({ reader, products, storeId, manual })
  if (manifestPath) await savePrivateManifest(manifestPath, manifest)
  if (generated) {
    if (!summary.stockReportRead) throw new InventoryError('MAPPING_HOLD', summary)
    await publishSnapshot(resolve(generated, 'inventory.json'), snapshot, products)
  }
  console.log(JSON.stringify({ status: generated ? 'published' : 'preflight_complete', endpoint: STOCK_ENDPOINT, ...summary }))
}

main().catch(error => {
  // Never include arbitrary provider response bodies, raw error messages or env values in logs.
  console.error(JSON.stringify(error instanceof InventoryError ? { status: error.message, ...error.details }
    : { status: 'INVENTORY_RUN_FAILED', code: error?.code || 'INVALID_CONFIG_OR_IO' }))
  process.exitCode = 1
})
