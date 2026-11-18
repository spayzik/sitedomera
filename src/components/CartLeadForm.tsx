import { useEffect, useRef, useState, type FormEvent, type MutableRefObject } from 'react'
import { cartSnapshot, type CartItem } from '../lib/cart'
import { trackAnalyticsGoal } from '../lib/analytics'
import './CartLeadForm.css'

const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i
const documentPath = /^\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.html$/i
const consentVersion = /^[a-z0-9][a-z0-9._-]{0,63}$/i

function configuredEndpoint(value: unknown) {
  if (value === '/api/lead') return value
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password &&
      url.pathname === '/api/lead' && !url.search && !url.hash ? url.href : null
  } catch { return null }
}

const endpoint = configuredEndpoint(import.meta.env.VITE_DEKORAY_LEAD_API)

type ConsentTerms = { consentPath: string; consentVersion: string }
type Receipt = { requestId: string }
export type LeadAttempt = { body: string; key: string; receipt?: Receipt }
type Props = { items: readonly CartItem[]; attempt: MutableRefObject<LeadAttempt | null> }

function errorMessage(status: number, error: unknown) {
  if (status === 409) return error === 'request_in_progress'
    ? 'Заявка ещё обрабатывается. Подождите немного и повторите отправку с теми же данными.'
    : 'Данные подборки изменились. Обсудите её в Telegram или по телефону.'
  if (status === 422) return 'Проверьте имя, телефон, согласие и выбранные товары.'
  if (status === 429) return 'Слишком много попыток. Повторите через минуту.'
  return 'Не удалось подтвердить приём. Повторите отправку с теми же данными или свяжитесь с нами.'
}

function fetchWithTimeout(resource: string, options: RequestInit, timeoutMs: number, controller: AbortController) {
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  return (async () => {
    try {
      const response = await fetch(resource, {
        credentials: 'omit', redirect: 'error', cache: 'no-store', ...options, signal: controller.signal,
      })
      const json = await response.json()
      return { response, json }
    } finally { window.clearTimeout(timer) }
  })()
}

function LeadFields({ endpoint, terms, items, attempt }: Props & { endpoint: string; terms: ConsentTerms }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const busy = useRef(false)
  const lastError = useRef<HTMLParagraphElement>(null)
  const success = useRef<HTMLParagraphElement>(null)
  const running = useRef<AbortController | null>(null)
  useEffect(() => () => running.current?.abort(), [])
  useEffect(() => { if (receipt) success.current?.focus() }, [receipt])
  useEffect(() => { if (error) lastError.current?.focus() }, [error])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current) return
    const form = new FormData(event.currentTarget)
    const body = JSON.stringify({
      name: String(form.get('name') ?? '').trim(),
      phone: String(form.get('phone') ?? '').trim(),
      email: String(form.get('email') ?? '').trim(),
      comment: String(form.get('comment') ?? '').trim(),
      website: String(form.get('website') ?? ''),
      items: cartSnapshot(items).sort((a, b) => a.id.localeCompare(b.id, 'en')),
      consent: { accepted: form.get('consent') === 'on', version: terms.consentVersion },
    })

    busy.current = true
    setSubmitting(true)
    setError('')
    const controller = new AbortController()
    running.current = controller
    try {
      if (attempt.current?.body !== body) attempt.current = { body, key: crypto.randomUUID() }
      const operation = attempt.current
      if (operation.receipt) {
        setReceipt(operation.receipt)
        return
      }
      const { response, json } = await fetchWithTimeout(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': operation.key }, body,
      }, 18_000, controller)
      if (![200, 201].includes(response.status) || json?.status !== 'accepted' ||
          typeof json.requestId !== 'string' || !uuid.test(json.requestId)) {
        setError(errorMessage(response.status, json?.error))
        return
      }
      operation.receipt = { requestId: json.requestId }
      setReceipt(operation.receipt)
      if (response.status === 201) trackAnalyticsGoal('lead_submit')
    } catch {
      setError(controller.signal.aborted
        ? 'Ответ задержался. Повторите отправку с теми же данными. Это продолжит прежнюю попытку.'
        : 'Не удалось подтвердить приём. Проверьте соединение и повторите отправку с теми же данными.')
    } finally {
      running.current = null
      busy.current = false
      setSubmitting(false)
    }
  }

  if (receipt) {
    return <p ref={success} tabIndex={-1} className="cart-lead-response" role="status">
      Заявка принята. Менеджер свяжется с вами, чтобы уточнить детали. Номер обращения: {receipt.requestId}
    </p>
  }

  return <form className="cart-lead-form ym-hide-content" onSubmit={submit} aria-busy={submitting}>
    <fieldset disabled={submitting}>
      <legend>Обсудить подборку</legend>
      <p>Передадим выбранные позиции менеджеру для проверки наличия и стоимости.</p>
      <label>Имя <input name="name" autoComplete="name" required minLength={2} maxLength={80} /></label>
      <label>Телефон <input name="phone" type="tel" autoComplete="tel" required minLength={10} maxLength={32} /></label>
      <label>Email (необязательно) <input name="email" type="email" autoComplete="email" maxLength={254} /></label>
      <label>Комментарий (необязательно) <textarea name="comment" rows={3} maxLength={1000} /></label>
      <div hidden aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" /></div>
      <div className="cart-lead-consent">
        <input type="checkbox" id="cart-lead-consent" name="consent" required aria-describedby="cart-lead-consent-document" />
        <div>
          <label htmlFor="cart-lead-consent">Даю согласие на обработку персональных данных для ответа на заявку.</label>
          <a id="cart-lead-consent-document" href={terms.consentPath} target="_blank" rel="noopener noreferrer">Текст согласия</a>
        </div>
      </div>
      <button type="submit" className="btn btn-primary btn-full interactive">
        {submitting ? 'Отправляем…' : error ? 'Повторить отправку' : 'Отправить заявку'}
      </button>
      {error && <p ref={lastError} tabIndex={-1} role="alert" className="form-error">{error}</p>}
    </fieldset>
  </form>
}

export function CartLeadForm({ items, attempt }: Props) {
  const [terms, setTerms] = useState<ConsentTerms | null>(null)
  useEffect(() => {
    if (!endpoint) return
    const controller = new AbortController()
    void fetchWithTimeout(endpoint, {}, 4500, controller).then(async ({ response, json }) => {
      if (!response.ok || json?.status !== 'ready' || typeof json.consentPath !== 'string' ||
          !documentPath.test(json.consentPath) || typeof json.consentVersion !== 'string' ||
          !consentVersion.test(json.consentVersion)) return
      // Verify the separately published document. A static SPA response cannot opt users in.
      const policy = await fetch(json.consentPath, {
        credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal,
      })
      if (!policy.ok || !policy.headers.get('Content-Type')?.includes('text/html')) return
      const page = new DOMParser().parseFromString(await policy.text(), 'text/html')
      if (page.querySelector('meta[name="dekoray-consent-version"]')?.getAttribute('content') !== json.consentVersion) return
      if (!controller.signal.aborted) setTerms({ consentPath: json.consentPath, consentVersion: json.consentVersion })
    }).catch(() => {})
    return () => controller.abort()
  }, [])

  return endpoint && terms && items.length > 0 ? <LeadFields endpoint={endpoint} terms={terms} items={items} attempt={attempt} /> : null
}
