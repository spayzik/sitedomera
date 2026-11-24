import { collections, products, type CollectionId } from '../data/products.ts'
import type { StockAvailability } from './inventory.ts'

type Category = CollectionId | 'all'
type StockStatus = StockAvailability['status']
type Sort = '' | 'price-asc' | 'price-desc' | 'name'

export interface CatalogFilters {
  category: Category
  query: string
  sort: Sort
  stock: '' | StockStatus
  thickness: string
}

const byName = new Intl.Collator('ru', { sensitivity: 'base', numeric: true })
const normalizeSearch = (value: string) => value.normalize('NFC').trim().toLocaleLowerCase('ru').replace(/\s+/g, ' ')
const compactSku = (value: string) => normalizeSearch(value).replace(/\s+/g, '')
const inCategory = (category: Category) => products.filter(product => category === 'all' || product.categoryId === category)

function productThickness(product: (typeof products)[number]) {
  return product.kind === 'flexible_stone' ? undefined : product.thicknessMm
}

export function publicCatalogQuery(value: string): string {
  const query = normalizeSearch(value)
  if (!query) return ''
  const sku = compactSku(value)
  return products.some(product => normalizeSearch(product.name).includes(query) ||
    (product.sku && compactSku(product.sku).includes(sku))) ? value.normalize('NFC').trim().replace(/\s+/g, ' ') : ''
}

export function catalogFilterOptions(category: Category) {
  const thicknesses = new Set(inCategory(category).flatMap(product => {
    const value = productThickness(product)
    return value === undefined ? [] : [value]
  }))
  return { thicknesses: [...thicknesses].sort((a, b) => a - b) }
}

export function parseCatalogFilters(params: URLSearchParams, fixedCategory?: CollectionId): CatalogFilters {
  const candidate = params.get('category')
  const category = fixedCategory ?? collections.find(item => item.id === candidate)?.id ?? 'all'
  const sort = params.get('sort')
  const stock = params.get('stock')
  const thickness = params.get('thickness')
  return {
    category,
    query: (params.get('q') ?? '').slice(0, 100),
    sort: sort === 'price-asc' || sort === 'price-desc' || sort === 'name' ? sort : '',
    stock: stock === 'in_stock' || stock === 'out_of_stock' || stock === 'unknown' ? stock : '',
    thickness: thickness && catalogFilterOptions(category).thicknesses.some(value => String(value) === thickness) ? thickness : '',
  }
}

export function writeCatalogFilters(previous: URLSearchParams, filters: CatalogFilters, fixedCategory?: CollectionId) {
  const params = new URLSearchParams(previous)
  const values = {
    category: fixedCategory || filters.category === 'all' ? '' : filters.category,
    q: publicCatalogQuery(filters.query),
    sort: filters.sort,
    stock: filters.stock,
    thickness: filters.thickness,
  }
  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, value)
    else params.delete(key)
  }
  return params
}

export function catalogResults(filters: CatalogFilters, stockStatus: (id: string) => StockStatus = () => 'unknown') {
  const query = normalizeSearch(filters.query)
  const skuQuery = compactSku(filters.query)
  const result = inCategory(filters.category).filter(product =>
    (!query || normalizeSearch(product.name).includes(query) || (product.sku && compactSku(product.sku).includes(skuQuery))) &&
    (!filters.stock || stockStatus(product.id) === filters.stock) &&
    (!filters.thickness || String(productThickness(product)) === filters.thickness),
  )
  if (filters.sort === 'name') result.sort((a, b) => byName.compare(a.name, b.name))
  if (filters.sort === 'price-asc') result.sort((a, b) => a.priceRub - b.priceRub || byName.compare(a.name, b.name))
  if (filters.sort === 'price-desc') result.sort((a, b) => b.priceRub - a.priceRub || byName.compare(a.name, b.name))
  return result
}
