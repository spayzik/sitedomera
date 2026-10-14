import type { Product } from '../data/products.ts'

export function sheetArea(product: Product | null): number {
  if (!product || !['panel', 'flexible_stone'].includes(product.kind)) return 0
  const { widthMm, lengthMm } = product.dimensions
  if (!widthMm || !Number.isFinite(widthMm) || !Number.isFinite(lengthMm) || widthMm <= 0 || lengthMm <= 0) return 0
  return widthMm * lengthMm / 1_000_000
}

export function calculatePanels(length: string, height: string, openings: string, product: Product | null) {
  const inputs = [length, height, openings]
  const values = inputs.map(value => Number(value.trim().replace(',', '.')))
  const panelArea = sheetArea(product)
  const valid = panelArea > 0 && inputs.every(value => value.trim() !== '') && values.every(value => Number.isFinite(value) && value >= 0 && value <= 10000)
  const area = valid ? Math.max(values[0] * values[1] - values[2], 0) : 0
  return { valid, area, sheets: valid ? Math.ceil(area / panelArea) : 0 }
}
