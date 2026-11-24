import { realpath, readFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createStockReader, InventoryError } from './moysklad.mjs'
import { publishCommerceState } from './commerce.mjs'

function absolutePath(variable) {
  const path = process.env[variable]
  if (!path || !isAbsolute(path)) throw new InventoryError('CONFIG_HOLD', { variable })
  return resolve(path)
}

function within(root, path) {
  const rel = relative(root, path)
  return !isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + sep)
}

async function main() {
  if (process.argv.length !== 2) throw new InventoryError('USAGE')
  const webroot = await realpath(absolutePath('DEKORAY_INVENTORY_WEBROOT'))
  const source = await realpath(fileURLToPath(new URL('../..', import.meta.url)))
  const state = absolutePath('DEKORAY_COMMERCE_STATE_FILE')
  const directory = await realpath(dirname(state))
  const policyPath = await realpath(absolutePath('DEKORAY_COMMERCE_POLICY_FILE'))
  const manifestPath = await realpath(absolutePath('DEKORAY_INVENTORY_MANIFEST_FILE'))
  const file = resolve(directory, relative(dirname(state), state))
  if ([webroot, source].some(root => [file, policyPath, manifestPath].some(path => within(root, path))) ||
      [policyPath, manifestPath].includes(file)) throw new InventoryError('CONFIG_HOLD')
  const [stock, mapping, approval] = await Promise.all([
    readFile(resolve(webroot, 'generated/inventory.json'), 'utf8'), readFile(manifestPath, 'utf8'), readFile(policyPath, 'utf8'),
  ])
  const manifest = JSON.parse(mapping)
  if (manifest.storeId !== process.env.MOYSKLAD_STORE_ID) throw new InventoryError('STORE_SELECTION_HOLD')
  const summary = await publishCommerceState({
    file, webroot, reader: createStockReader(process.env.MOYSKLAD_API_TOKEN), snapshot: JSON.parse(stock),
    manifest, policy: JSON.parse(approval),
  })
  console.log(JSON.stringify({ status: 'commerce_published', ...summary }))
}

main().catch(error => {
  console.error(JSON.stringify(error instanceof InventoryError ? { status: error.message } : { status: 'COMMERCE_PUBLISH_FAILED' }))
  process.exitCode = 1
})
