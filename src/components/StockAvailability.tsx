import { useStockAvailability } from '../context/inventoryState'
import { stockLabel } from '../lib/inventory'

const updatedTime = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' })

export function StockAvailability({ productId, details = false, purchase }: {
  productId: string; details?: boolean; purchase?: 'confirmed' | 'unconfirmed'
}) {
  const stock = useStockAvailability(productId)
  return (
    <div className={'stock-availability stock-' + stock.status} data-stock={stock.status}>
      <span className="stock-status"><span className="stock-dot" aria-hidden="true" />{stockLabel(stock)}</span>
      {purchase && stock.status === 'in_stock' && <span className="stock-time">
        {purchase === 'confirmed' ? 'Доступен к заказу' : 'Возможность заказа уточнит менеджер'}
      </span>}
      {details && stock.status !== 'unknown' && (
        <time className="stock-time" dateTime={stock.updatedAt}>
          Обновлено в {updatedTime.format(new Date(stock.updatedAt))} МСК
        </time>
      )}
    </div>
  )
}
