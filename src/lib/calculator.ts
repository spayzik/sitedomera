import type { Product } from '../data/products.ts'
import { MAX_QTY } from './cart.ts'

export function sheetArea(product: Product | null): number {
  if (!product || !['panel', 'flexible_stone'].includes(product.kind)) return 0
  const { widthMm, lengthMm } = product.dimensions
  if (!widthMm || !Number.isFinite(widthMm) || !Number.isFinite(lengthMm) || widthMm <= 0 || lengthMm <= 0) return 0
  return widthMm * lengthMm / 1_000_000
}

export function sheetPricePerSquareMeter(product: Product | null): number | null {
  if (!product || !Number.isFinite(product.priceRub) || product.priceRub <= 0) return null
  const area = sheetArea(product)
  return area > 0 ? Math.round(product.priceRub / area) : null
}

function roundUpSheets(area: number, pieceArea: number) {
  const sheets = area / pieceArea
  const nearest = Math.round(sheets)
  // Arithmetic such as 40.26 / 3.66 can land a few bits above 11.
  return nearest > 0 && Math.abs(sheets - nearest) <= 4 * Number.EPSILON * Math.max(1, sheets)
    ? nearest
    : Math.ceil(sheets)
}

export function calculatePanels(length: string, height: string, openings: string, product: Product | null) {
  const inputs = [length, height, openings]
  const values = inputs.map(value => Number(value.trim().replace(',', '.')))
  const panelArea = sheetArea(product)
  const valid = panelArea > 0 && inputs.every(value => value.trim() !== '') && values.every(value => Number.isFinite(value) && value >= 0 && value <= 10000)
  const area = valid ? Math.max(values[0] * values[1] - values[2], 0) : 0
  return { valid, area, sheets: valid ? roundUpSheets(area, panelArea) : 0 }
}

export interface WallDimensions {
  length: string
  height: string
}

const decimal = (value: string) => Number(value.trim().replace(',', '.'))
const validMeasure = (value: string) => /^[0-9]+(?:[.,][0-9]+)?$/.test(value.trim()) && decimal(value) <= 10000

export function calculatorQuery(materialId: string, wall: WallDimensions) {
  const params = new URLSearchParams({ material: materialId })
  if (validMeasure(wall.length) && validMeasure(wall.height)) {
    params.set('width', wall.length.trim())
    params.set('height', wall.height.trim())
  }
  return params
}

export function calculatorWall(params: URLSearchParams): WallDimensions {
  const length = params.get('width') ?? ''
  const height = params.get('height') ?? ''
  return validMeasure(length) && validMeasure(height) ? { length, height } : { length: '10', height: '2.5' }
}

export function calculateWallLayout(walls: readonly WallDimensions[], reserve: string, product: Product | null) {
  if (!product || !sheetArea(product) || !walls.length || walls.length > 20 ||
      !validMeasure(reserve) || decimal(reserve) > 100 ||
      walls.some(wall => !validMeasure(wall.length) || !validMeasure(wall.height))) return null

  const width = product.dimensions.widthMm! / 1000
  const height = product.dimensions.lengthMm / 1000
  const pieces = walls.reduce((sum, wall) =>
    sum + roundUpSheets(decimal(wall.length), width) * roundUpSheets(decimal(wall.height), height), 0)
  return roundUpSheets(pieces * (100 + decimal(reserve)), 100)
}

export function calculateProjectPanels(walls: readonly WallDimensions[], openings: string | number | null, reserve: string, product: Product | null) {
  const inputs = [...walls.flatMap(wall => [wall.length, wall.height]), reserve]
  const openingsValue = typeof openings === 'string' && validMeasure(openings) ? decimal(openings) : openings
  const valid = walls.length > 0 && walls.length <= 20 && sheetArea(product) > 0 &&
    inputs.every(validMeasure) &&
    decimal(reserve) <= 100 && typeof openingsValue === 'number' && Number.isFinite(openingsValue) && openingsValue >= 0 && openingsValue <= 10_000
  const area = valid ? Math.max(0, walls.reduce((sum, wall) => sum + decimal(wall.length) * decimal(wall.height), 0) - openingsValue) : 0
  const estimatedArea = valid ? area * (1 + decimal(reserve) / 100) : 0
  return { valid, area, estimatedArea, sheets: valid ? roundUpSheets(estimatedArea, sheetArea(product)) : 0 }
}

export function openingsArea(walls: readonly WallDimensions[], extraArea: string): number | null {
  if (!validMeasure(extraArea) || walls.length > 20 ||
      walls.some(opening => !validMeasure(opening.length) || !validMeasure(opening.height))) return null
  const area = decimal(extraArea) + walls.reduce((sum, opening) =>
    sum + decimal(opening.length) * decimal(opening.height), 0)
  return area <= 10_000 ? area : null
}

export function calculateLinearPieces(product: Product | null, length: string, count: string): number | null {
  if (!product || (product.kind !== 'slat' && product.kind !== 'profile') || product.unit !== 'шт') return null
  if (!validMeasure(length) || !/^\d+$/.test(count.trim())) return null
  const meters = decimal(length)
  const quantity = decimal(count)
  if (meters <= 0 || meters > product.dimensions.lengthMm / 1000 || quantity < 1 || quantity > MAX_QTY) return null
  // Plan each visible run as a single unjoined piece and leave offcuts unallocated.
  return quantity
}
