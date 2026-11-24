import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calculateLinearPieces, calculatePanels, calculateProjectPanels, openingsArea, sheetArea, sheetPricePerSquareMeter } from '../src/lib/calculator.ts'
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

test('multiple walls apply openings before reserve and preserve per-item sheet dimensions', () => {
  const walls = [{ length: '3', height: '2,5' }, { length: '4', height: '2' }]
  const result = calculateProjectPanels(walls, '1,5', '10', material)
  assert.equal(result.area, 14)
  assert.ok(Math.abs(result.estimatedArea - 15.4) < 0.00001)
  assert.equal(result.sheets, 5)
  assert.equal(calculateProjectPanels(walls, '100', '10', material).sheets, 0)
  assert.equal(calculateProjectPanels(walls, '0', '101', material).valid, false)
  assert.equal(calculateProjectPanels([{length: '', height: '2'}], '0', '10', material).valid, false)
})

test('floating-point noise at the exact sheet boundary does not add a whole sheet', () => {
  assert.equal(calculatePanels('1.52', '3', '0.9', material).sheets, 1)
  assert.equal(calculateProjectPanels([{ length: '10.8', height: '3.5' }], '1.2', '10', material).sheets, 11)
  assert.equal(calculateProjectPanels([{ length: '10.80001', height: '3.5' }], '1.2', '10', material).sheets, 12)
  assert.equal(calculateProjectPanels([{ length: '0.00001', height: '0.00001' }], '0', '10', material).sheets, 1)
})

test('single-wall estimate hands the selected product and measured wall to the full calculator', async () => {
  const { calculatorQuery, calculatorWall } = await import('../src/lib/calculator.ts')
  const query = calculatorQuery(material.id, { length: '4,25', height: '2.5' })
  assert.equal(query.get('material'), material.id)
  const wall = calculatorWall(query)
  assert.deepEqual(wall, { length: '4,25', height: '2.5' })
  assert.deepEqual(calculatorWall(new URLSearchParams('width=6&height=NaN')), { length: '10', height: '2.5' })
  assert.deepEqual(calculatorWall(new URLSearchParams()), { length: '10', height: '2.5' })
  assert.equal(calculatorQuery(material.id, { length: '0x10', height: '2' }).has('width'), false)
  assert.equal(calculateProjectPanels([wall], '0', '10', material).sheets, 4)
})

test('straight vertical panel layout counts each wall and does not assume cutout or offcut reuse', async () => {
  const { calculateWallLayout } = await import('../src/lib/calculator.ts')
  const walls = [{ length: '2.5', height: '2.6' }, { length: '1,22', height: '3' }]
  assert.equal(calculateWallLayout(walls, '10', material), 5)
  assert.equal(calculateWallLayout([{ length: '1.22', height: '3' }], '0', material), 1)
  assert.equal(calculateWallLayout([{ length: '1.22', height: '3.01' }], '0', material), 2)
  assert.equal(calculateWallLayout(walls, '101', material), null)
  assert.equal(calculateWallLayout([{ length: '', height: '3' }], '10', material), null)
  assert.equal(calculateWallLayout(walls, '10', products.find(p => p.kind === 'slat')), null)
})

test('separate windows and doors reduce the sheet quote without silently accepting a partial cutout', () => {
  const wall = { length: '4', height: '3' }
  const cutouts = [{ length: '1', height: '1' }, { length: '1', height: '2' }]
  assert.equal(openingsArea(cutouts, '0,5'), 3.5)
  assert.equal(calculateProjectPanels([wall], openingsArea(cutouts, '0,5'), '10', material).sheets, 3)
  assert.equal(calculateProjectPanels([wall], '0', '10', material).sheets, 4)
  assert.equal(calculateProjectPanels([wall], openingsArea([{ length: '1', height: '' }], '0'), '10', material).valid, false)
})

test('measured rail and profile runs use real stock length and selling unit', () => {
  const rail = products.find(p => p.kind === 'slat')
  const profile = products.find(p => p.kind === 'profile')
  assert.equal(calculateLinearPieces(rail, '2,8', '4'), 4)
  assert.equal(calculateLinearPieces(profile, '3', '2'), 2)
  assert.equal(calculateLinearPieces(profile, '3,01', '2'), null)
  assert.equal(calculateLinearPieces(material, '2.8', '2'), null)
  for (const count of ['0', '2.5', '10000', '1e2']) assert.equal(calculateLinearPieces(profile, '2', count), null)
  for (const run of ['', '0', 'NaN', '0x10']) assert.equal(calculateLinearPieces(profile, run, '2'), null)
})
