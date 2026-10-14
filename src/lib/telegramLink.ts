import type { CartItem } from './cart.ts'
import { formatDimensions } from '../data/products.ts'
import type { Product } from '../data/products'

const formatPrice = (value: number) =>
  `${new Intl.NumberFormat('ru-RU').format(value).replace(/[\u00a0\u202f]/g, ' ')} ₽`

export function formatCartTelegramMessage(items: readonly CartItem[]): string {
  if (items.length === 0) return ''

  const lines = items.map(({ product, qty }, index) =>
    `${index + 1}. ${product.name}${product.sku && product.name !== product.sku ? ` (${product.sku})` : ''} — ${qty} ${product.unit === 'шт' ? 'шт.' : product.unit} × ${formatPrice(product.priceRub)} = ${formatPrice(qty * product.priceRub)}`,
  )
  const total = items.reduce((sum, { product, qty }) => sum + product.priceRub * qty, 0)

  return [
    'Здравствуйте! Заинтересовался товарами на сайте Домэра:',
    '',
    ...lines,
    '',
    `Итого: ${formatPrice(total)}`,
    '',
    'Подскажите, пожалуйста, по наличию и доставке.',
  ].join('\n')
}

function formatProductDetails(product: Product, collection: string): string[] {
  const unit = product.unit === 'шт' ? 'шт.' : product.unit
  return [
    product.name,
    ...(product.sku ? [`Артикул: ${product.sku}`] : []),
    `Коллекция: ${collection}`,
    `Размер: ${formatDimensions(product)}`,
    `Цена: ${formatPrice(product.priceRub)}/${unit}`,
  ]
}

export function formatCalculatorTelegramMessage({ area, sheets, panel, total }: {
  area: number
  sheets: number
  panel: Product
  total: number
}): string {
  return [
    'Здравствуйте! Сделал расчёт на сайте Домэра.',
    '',
    `Площадь стен: ${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(area)} м²`,
    `Материал: ${panel.name}`,
    ...(panel.sku ? [`Артикул: ${panel.sku}`] : []),
    `Количество: ${sheets} лист.`,
    `Цена материала: ${formatPrice(panel.priceRub)}/${panel.unit === 'шт' ? 'шт.' : panel.unit}`,
    `Ориентировочная стоимость: ${formatPrice(total)}`,
    '',
    'Хочу уточнить точный расчёт с профилями и наличие.',
  ].join('\n')
}

export function formatQuizTelegramMessage(product: Product, collection: string): string {
  return [
    'Здравствуйте! Прошёл подбор на сайте Домэра.',
    '',
    'Выбрал материал после подбора категории:',
    ...formatProductDetails(product, collection),
    '',
    'Хочу уточнить наличие и детали.',
  ].join('\n')
}

export function formatProductTelegramMessage(product: Product, collection: string): string {
  return [
    'Здравствуйте! Заинтересовался товаром на сайте Домэра:',
    '',
    ...formatProductDetails(product, collection),
    '',
    'Подскажите, пожалуйста, по наличию и доставке.',
  ].join('\n')
}

export function buildTelegramDraftUrl(baseUrl: string, message: string): string {
  const url = new URL(baseUrl)
  if (url.protocol !== 'https:' || url.hostname !== 't.me' || !/^\/[a-zA-Z0-9_]{5,32}\/?$/.test(url.pathname)) {
    throw new Error('Expected a trusted Telegram username URL')
  }
  url.searchParams.set('text', message)
  return url.toString()
}
