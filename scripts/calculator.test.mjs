import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calculatePanels, sheetArea, sheetPricePerSquareMeter } from '../src/lib/calculator.ts'
import { products } from '../src/data/products.ts'
const material = products.find(p => p.sku === 'C807601-36')

test('decimal separators and openings produce the same area and panel count', () => {
  assert.deepEqual(calculatePanels('10', '2,5', '0', material), { valid: true, area: 25, sheets: 7 })
  assert.deepEqual(calculatePanels('10', '2.5', '3', material), { valid: true, area: 22, sheets: 7 })
})
test('zero and openings exceeding wall area cannot produce negative panels', () => {
  assert.deepEqual(calculatePanels('0', '2.5', '0', material), { valid: true, area: 0, sheets: 0 })
  assert.deepEqual(calculatePanels('10', '2.5', '30', material), { valid: true, area: 0, sheets: 0 })
})
test('large reasonable dimensions stay finite; invalid dimensions never reach drafts', () => {
  assert.deepEqual(calculatePanels('1000', '3', '0', material), { valid: true, area: 3000, sheets: 820 })
  for (const value of ['-1', 'Infinity', '1e309', 'wrong', '10001']) {
    assert.deepEqual(calculatePanels(value, '3', '0', material), { valid: false, area: 0, sheets: 0 })
  }
})

test('derived area price uses the sheet dimensions and never changes the selling unit', () => {
  const sheet = { ...material, priceRub: 7000, unit: 'лист', dimensions: { widthMm: 1220, lengthMm: 3000 } }
  assert.equal(sheetArea(sheet), 3.66)
  assert.equal(sheetPricePerSquareMeter(sheet), 1913)
  assert.equal(sheetPricePerSquareMeter({ ...sheet, priceRub: 3200, dimensions: { widthMm: 1000, lengthMm: 2000 } }), 1600)
  assert.equal(sheetPricePerSquareMeter({ ...sheet, kind: 'flexible_stone', dimensions: { widthMm: 1200, lengthMm: 2400 } }), 2431)
  assert.equal(sheetPricePerSquareMeter({ ...sheet, dimensions: { lengthMm: 3000 } }), null)
  assert.equal(sheetPricePerSquareMeter({ ...sheet, dimensions: { widthMm: -1220, lengthMm: 3000 } }), null)
  assert.equal(sheetPricePerSquareMeter({ ...sheet, unit: 'шт' }), 1913)
  for (const kind of ['slat', 'profile']) assert.equal(sheetPricePerSquareMeter({ ...sheet, kind }), null)
  assert.equal(sheet.priceRub, 7000)
})
