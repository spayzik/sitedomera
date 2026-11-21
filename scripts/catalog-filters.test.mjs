import assert from 'node:assert/strict'
import { test } from 'node:test'
import { catalogFilterOptions, catalogResults, parseCatalogFilters, writeCatalogFilters } from '../src/lib/catalogFilters.ts'

test('catalog search tolerates mixed case, multiple spaces and spaces around SKU separators', () => {
  for (const [query, sku] of [['  ЯСЕНЬ    ПЕСОЧНЫЙ ', 'C807601-36'], [' c807601  -  36 ', 'C807601-36']]) {
    const matches = catalogResults(parseCatalogFilters(new URLSearchParams({ q: query })))
    assert.deepEqual(matches.map(product => product.sku), [sku])
  }
  assert.equal(catalogResults(parseCatalogFilters(new URLSearchParams({ q: 'ясень серый' })))[0].sku, null)
})

test('confirmed thickness and stock filters never include unverified or zero entries as available', () => {
  const filters = parseCatalogFilters(new URLSearchParams('category=wood&thickness=5&stock=in_stock&sort=price-desc'))
  const wood = catalogResults({ ...filters, stock: '' })
  const verifiedId = wood[0].id
  assert.deepEqual(catalogResults(filters, id => id === verifiedId ? 'in_stock' : 'out_of_stock').map(product => product.id), [verifiedId])
  assert.equal(catalogResults({ ...filters, category: 'flexible_stone' }, () => 'in_stock').length, 0)
  assert.equal(catalogFilterOptions('flexible_stone').thicknesses.length, 0)
  assert.equal(catalogResults(filters).length, 0, 'absent snapshot is unknown')
  const cheaperFirst = catalogResults(parseCatalogFilters(new URLSearchParams('sort=price-asc')))
  assert.ok(cheaperFirst.every((product, index) => !index || cheaperFirst[index - 1].priceRub <= product.priceRub))
})

test('filter URLs round trip, preserve unrelated context and reject unsupported options', () => {
  const url = new URLSearchParams('sku=A9001&q=%D0%AF%D1%81%D0%B5%D0%BD%D1%8C&sort=price-asc&stock=invalid&category=wood')
  const filters = parseCatalogFilters(url)
  assert.equal(filters.stock, '')
  assert.equal(filters.category, 'wood')
  assert.equal(filters.query, 'Ясень')
  const next = writeCatalogFilters(url, { ...filters, sort: 'name' })
  assert.equal(next.get('sku'), 'A9001')
  assert.equal(next.has('stock'), false)
  assert.equal(parseCatalogFilters(next).sort, 'name')
  assert.equal(parseCatalogFilters(next, 'fabric').category, 'fabric')
})
