import { useStockAvailability } from '../context/inventoryState'

const amount = new Intl.NumberFormat('ru-RU', { maximumSignificantDigits: 21 })
const plural = new Intl.PluralRules('ru-RU')
const updatedTime = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' })

function formatUnits(quantity: number, unit: 'шт' | 'лист') {
  if (unit === 'шт') return amount.format(quantity) + ' шт.'
  const form = plural.select(quantity)
  return amount.format(quantity) + ' ' + (form === 'one' ? 'лист' : form === 'many' ? 'листов' : 'листа')
}

export function StockAvailability({ productId, details = false }: { productId: string; details?: boolean }) {
  const stock = useStockAvailability(productId)
  const label = stock.status === 'in_stock' ? 'В наличии на складе в Москве — ' + formatUnits(stock.quantity, stock.unit)
    : stock.status === 'out_of_stock' ? 'Нет на складе' : 'Наличие уточняется'
  return (
    <div className={'stock-availability stock-' + stock.status} data-stock={stock.status}>
      <span className="stock-status"><span className="stock-dot" aria-hidden="true" />{label}</span>
      {details && stock.status !== 'unknown' && (
        <time className="stock-time" dateTime={stock.updatedAt}>
          Обновлено в {updatedTime.format(new Date(stock.updatedAt))} МСК
        </time>
      )}
    </div>
  )
}
