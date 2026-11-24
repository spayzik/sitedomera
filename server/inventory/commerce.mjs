import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { products } from '../../src/data/products.ts'
import { availabilityFor, isStockQuantity, parseInventory } from '../../src/lib/inventory.ts'
import { renderYml } from '../../scripts/product-feed.mjs'
import { InventoryError, isUuid } from './moysklad.mjs'
import { atomicWrite } from './sync.mjs'

const sha256 = content => createHash('sha256').update(content).digest('hex')
const isRecord = value => value && typeof value === 'object' && !Array.isArray(value)
const withoutDate = yml => yml.replace(/(<yml_catalog date=")[^"]+("\s*>)/, '$1$2')

export function parseCommercePolicy(value) {
  const keys = ['version', 'legalName', 'delivery', 'pickup', 'approvedPriceMinor']
  if (!isRecord(value) || Object.keys(value).length !== keys.length || !keys.every(key => Object.hasOwn(value, key)) ||
      value.version !== 1 || typeof value.legalName !== 'string' || !value.legalName.trim() ||
      value.legalName !== value.legalName.trim() || value.legalName.length > 200 ||
      [...value.legalName].some(character => character.charCodeAt(0) < 32 || ['\ufffe', '\uffff'].includes(character)) ||
      typeof value.delivery !== 'boolean' || typeof value.pickup !== 'boolean' || !(value.delivery || value.pickup) ||
      !isRecord(value.approvedPriceMinor)) {
    throw new InventoryError('INVALID_COMMERCE_POLICY')
  }
  const productIds = new Set(products.map(({ id }) => id))
  for (const [id, price] of Object.entries(value.approvedPriceMinor)) {
    if (!productIds.has(id) || !Number.isSafeInteger(price) || price <= 0) throw new InventoryError('INVALID_COMMERCE_POLICY')
  }
  return value
}

export async function publishCommerceState({ file, webroot, reader, snapshot, manifest, policy, now = Date.now }) {
  const commerce = parseCommercePolicy(policy)
  const inventory = parseInventory(snapshot, products, now())
  if (manifest?.updatedAt !== inventory.updatedAt || !isUuid(manifest.storeId) || !Array.isArray(manifest.entries)) {
    throw new InventoryError('COMMERCE_SNAPSHOT_MISMATCH')
  }
  if (inventory.expiresAt <= now()) throw new InventoryError('STALE_SNAPSHOT')
  const directFallback = await readFile(resolve(webroot, 'yml-direct.xml'), 'utf8')
  if (withoutDate(directFallback) !== withoutDate(renderYml(new Date(now())))) {
    throw new InventoryError('COMMERCE_CATALOG_RELEASE_MISMATCH')
  }
  const identities = new Map(manifest.entries.map(entry => [entry.productId, entry]))
  if (identities.size !== products.length || manifest.entries.length !== products.length ||
      products.some(product => !identities.has(product.id))) throw new InventoryError('COMMERCE_SNAPSHOT_MISMATCH')
  const candidates = products.flatMap(product => {
    const stock = availabilityFor(inventory, product.id, now())
    const { crmId, quantity, unit, stockStatus, crmType } = identities.get(product.id)
    return isUuid(crmId) && ['product', 'variant'].includes(crmType) && stockStatus === 'verified' &&
      stock.status === 'in_stock' && stock.quantity >= 1 && stock.quantity === quantity && stock.unit === unit &&
      commerce.approvedPriceMinor[product.id] === Math.round(product.priceRub * 100)
      ? [{ id: product.id, crmId, physical: stock.quantity }] : []
  })
  const free = candidates.length ? await reader.sellableStock(manifest.storeId, candidates.map(({ crmId }) => crmId)) : new Map()
  const saleable = new Set(candidates.filter(({ crmId, physical }) => {
    const quantity = free.get(crmId)
    return isStockQuantity(quantity) && quantity >= 1 && quantity <= physical
  }).map(({ id }) => id))
  const generatedAt = new Date(now())
  if (generatedAt.valueOf() >= inventory.expiresAt) throw new InventoryError('STALE_SNAPSHOT')
  await atomicWrite(file, {
    version: 1,
    updatedAt: snapshot.updatedAt,
    inventoryDigest: sha256(JSON.stringify(snapshot) + '\n'),
    catalogDigest: sha256(directFallback),
    saleable: [...saleable],
    search: renderYml(generatedAt, { channel: 'search', saleable, commerce }),
    direct: renderYml(generatedAt, { saleable, commerce }),
  }, 0o600)
  return { availableOffers: saleable.size }
}
