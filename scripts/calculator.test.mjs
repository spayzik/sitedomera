import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calculatePanels } from '../src/lib/calculator.ts'
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
