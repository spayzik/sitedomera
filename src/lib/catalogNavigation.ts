import { collections, products, type CollectionId } from '../data/products.ts'
import { productPath } from '../data/seoPaths.ts'

export function legacyProductPath(hash: string): string | null {
  if (!hash.startsWith('#/catalog?')) return null
  const params = new URLSearchParams(hash.slice('#/catalog?'.length))
  if ([...params.keys()].some(key => key !== 'category' && key !== 'sku') ||
      params.getAll('sku').length !== 1 || params.getAll('category').length > 1) return null
  const { product } = parseCatalogHash(hash)
  const category = params.get('category')
  return product && (!category || category === product.categoryId) ? productPath(product) : null
}

export function parseCatalogHash(hash: string) {
  const params = new URLSearchParams(hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '')
  const category = params.get('category')
  const sku = params.get('sku')
  const categoryId: CollectionId | 'all' = collections.some(c => c.id === category) ? category as CollectionId : 'all'
  return { categoryId, product: sku ? products.find(p => p.id === sku || p.sku === sku) ?? null : null }
}

export function updateCatalogHash(hash: string, patch: { category?: CollectionId | 'all'; sku?: string | null }) {
  const params = new URLSearchParams(hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '')
  if (patch.category !== undefined) {
    if (patch.category === 'all') params.delete('category')
    else params.set('category', patch.category)
  }
  if (patch.sku !== undefined) {
    if (patch.sku === null) params.delete('sku')
    else params.set('sku', patch.sku)
  }
  const query = params.toString()
  return '#/catalog' + (query ? '?' + query : '')
}
