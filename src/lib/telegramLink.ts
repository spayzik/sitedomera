import type { CartItem } from '../context/CartContext'

const formatPrice = (value: number) =>
  `${new Intl.NumberFormat('ru-RU').format(value).replace(/[\u00a0\u202f]/g, ' ')} ₽`

export function formatCartTelegramMessage(items: readonly CartItem[]): string {
  if (items.length === 0) return ''

  const lines = items.map(({ product, qty }, index) =>
    `${index + 1}. ${product.name} — ${qty} шт. × ${formatPrice(product.price)} = ${formatPrice(qty * product.price)}`,
  )
  const total = items.reduce((sum, { product, qty }) => sum + product.price * qty, 0)

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

export function buildTelegramDraftUrl(baseUrl: string, message: string): string {
  const url = new URL(baseUrl)
  if (url.protocol !== 'https:' || url.hostname !== 't.me' || !/^\/[a-zA-Z0-9_]{5,32}\/?$/.test(url.pathname)) {
    throw new Error('Expected a trusted Telegram username URL')
  }
  url.searchParams.set('text', message)
  return url.toString()
}
