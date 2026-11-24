import { useEffect, useRef, useState } from 'react'
import { trackAnalyticsCheckout, trackAnalyticsPurchase } from '../lib/analytics'
import { fetchPaymentOrder, hasPaymentOrder, paymentProviderUrl, type PaymentOrder } from '../lib/paymentClient'
import './CartLeadForm.css'

const labels: Record<PaymentOrder['status'], string> = {
  awaiting_payment: 'Ожидает оплаты',
  pending: 'Проверяем оплату',
  paid: 'Заказ оплачен',
  canceled: 'Платёж отменён',
  partially_refunded: 'Часть суммы возвращена',
  refunded: 'Платёж возвращён',
}

const rubles = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' })
const format = (minor: number) => rubles.format(minor / 100)
const ecommerce = (order: PaymentOrder) => ({
  valueRub: order.totalMinor / 100,
  items: order.items.map(({ id, quantity, priceMinor }) => ({ id, quantity, priceRub: priceMinor / 100 })),
})

export function OrderPayment() {
  const [visible, setVisible] = useState(false)
  const [order, setOrder] = useState<PaymentOrder>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const active = useRef(false)

  function apply(next: PaymentOrder) {
    setOrder(next)
    if (next.status === 'paid' && typeof next.paidAt === 'number' && next.paidAt > 0) {
      void trackAnalyticsPurchase({
        ...ecommerce(next), transactionId: next.orderId, status: 'succeeded', verified: true,
      })
    }
  }

  useEffect(() => {
    if (!hasPaymentOrder()) return
    const controller = new AbortController()
    setVisible(true)
    void fetchPaymentOrder('status', controller.signal).then(next => {
      if (!controller.signal.aborted) apply(next)
    }).catch(reason => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Не удалось загрузить заказ.')
    })
    return () => controller.abort()
  }, [])

  if (!visible) return null

  async function act(action: 'start' | 'status') {
    if (active.current) return
    active.current = true
    setBusy(true)
    setError('')
    try {
      if (action === 'start' && order) trackAnalyticsCheckout({ ...ecommerce(order), transactionId: order.orderId })
      const next = await fetchPaymentOrder(action, undefined, action === 'start' ? order?.delivery.id : undefined)
      apply(next)
      if (action === 'start' && next.status === 'pending') {
        const url = paymentProviderUrl(next.confirmationUrl)
        if (!url) throw new Error('Не удалось открыть платёжную страницу. Проверьте статус заказа.')
        location.assign(url)
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось выполнить действие.')
    } finally {
      active.current = false
      setBusy(false)
    }
  }

  return <section className="cart-lead-form ym-hide-content" id="oplata" aria-labelledby="payment-title">
    <h2 id="payment-title">Оплата заказа</h2>
    {import.meta.env.VITE_DEKORAY_PREVIEW === '1' && <p>Тестовая оплата. Деньги не списываются.</p>}
    {error && <p role="alert">{error}</p>}
    {!order && !error && <p role="status">Загружаем подтверждённый заказ…</p>}
    {order && <>
      <p role="status">{labels[order.status]}</p>
      <ul>
        {order.items.map(item => <li key={item.id}>
          {item.name} × {item.quantity} · {format(item.priceMinor * item.quantity)}
        </li>)}
      </ul>
      <p>{order.delivery.label} · {format(order.delivery.priceMinor)}</p>
      <div className="total-row"><span>Итого по заказу</span><strong>{format(order.totalMinor)}</strong></div>
    </>}
    {order?.status === 'awaiting_payment' && <button className="btn btn-primary" disabled={busy}
      onClick={() => void act('start')}>Оплатить онлайн</button>}
    {order?.status === 'pending' && paymentProviderUrl(order.confirmationUrl) &&
      <button className="btn btn-primary" disabled={busy} onClick={() => {
        const url = paymentProviderUrl(order.confirmationUrl)
        if (url) location.assign(url)
      }}>Продолжить оплату</button>}
    {(order?.status === 'pending' || error) && <button className="btn btn-outline" disabled={busy}
      onClick={() => void act('status')}>Проверить статус</button>}
  </section>
}
