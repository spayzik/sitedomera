const preview = import.meta.env.VITE_DEKORAY_PREVIEW === '1'
const previewEndpoint = import.meta.env.VITE_DEKORAY_STAGING_PAYMENT_API
const storageKey = 'dekoray-payment-access'
const tokenPattern = /^[a-f0-9]{64}$/
let access: string | null = null

export function readPaymentFragment() {
  const hash = window.location.hash
  if (!hash.startsWith('#oplata=')) return
  const token = hash.slice('#oplata='.length)
  access = tokenPattern.test(token) ? token : null
  history.replaceState(history.state, '', location.pathname + location.search + '#oplata')
  try {
    if (access) sessionStorage.setItem(storageKey, access)
    else sessionStorage.removeItem(storageKey)
  } catch { /* The current document can still display the authorization result. */ }
}

function paymentAccess() {
  if (access) return access
  try {
    const token = sessionStorage.getItem(storageKey)
    return token && tokenPattern.test(token) ? token : null
  } catch { return null }
}

export type PaymentOrder = {
  orderId: string
  status: 'awaiting_payment' | 'pending' | 'paid' | 'canceled' | 'partially_refunded' | 'refunded'
  currency: 'RUB'
  totalMinor: number
  items: { id: string; name: string; quantity: number; priceMinor: number }[]
  delivery: { id: string; label: string; priceMinor: number }
  paidAt?: number
  confirmationUrl?: string
}

function sandboxEndpoint() {
  if (!previewEndpoint) return null
  try {
    const url = new URL(previewEndpoint)
    if (url.protocol === 'https:' && url.pathname === '/api/payment' &&
        !url.username && !url.password && !url.search && !url.hash &&
        !/(^|\.)xn--80ahdrdyo\.xn--p1ai\.?$/i.test(url.hostname)) return url.href
  } catch { /* An invalid staging URL disables checkout. */ }
  return null
}

export const paymentEndpoint = preview ? sandboxEndpoint() : import.meta.env.DEV ? null : '/api/payment'
export const hasPaymentOrder = () => Boolean(paymentEndpoint && paymentAccess())

export async function fetchPaymentOrder(
  action: 'quote' | 'start' | 'status', signal?: AbortSignal, deliveryId?: string,
): Promise<PaymentOrder> {
  const token = paymentAccess()
  if (!paymentEndpoint || !token) throw new Error('Ссылка на оплату недоступна.')
  const options = { signal, credentials: 'omit', cache: 'no-store', redirect: 'error' } as const
  const readiness = await fetch(paymentEndpoint, options)
  const mode = preview ? 'sandbox' : 'production'
  if (!readiness.ok || (await readiness.json()).mode !== mode) throw new Error('Оплата пока недоступна.')
  const response = await fetch(paymentEndpoint, {
    ...options,
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, deliveryId }),
  })
  if (response.status === 410) throw new Error('Срок действия ссылки истёк. Запросите новую ссылку у менеджера.')
  if (!response.ok) throw new Error('Не удалось получить статус заказа. Проверьте связь и повторите.')
  return response.json()
}

export function paymentProviderUrl(value?: string) {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' && ['yookassa.ru', 'yoomoney.ru'].some(domain =>
      url.hostname === domain || url.hostname.endsWith('.' + domain)) && !url.username && !url.password) return url.href
  } catch { /* The server returned an unrecognized provider redirect. */ }
  return null
}
