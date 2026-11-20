import type { Product } from '../data/products'
import { sheetPricePerSquareMeter } from '../lib/calculator'

export function SheetUnitPrice({ product }: { product: Product }) {
  const price = sheetPricePerSquareMeter(product)
  if (price === null) return null
  return <span className="sheet-unit-price">≈ {price.toLocaleString('ru-RU')} ₽/м²</span>
}
