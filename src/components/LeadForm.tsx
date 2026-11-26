import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from 'react'
import { readAnalyticsConsent, readMarketingAttribution, trackAnalyticsGoal } from '../lib/analytics'
import { postLead, trackLeadReceipt, type LeadAttempt, type LeadReceipt, type LeadTerms } from '../lib/leadClient'
import type { LeadDetails, LeadIntent } from '../lib/leadIntents'
import { products } from '../data/products'
import { StoreSelect } from './StoreSelect'
import './CartLeadForm.css'

type Fields = { items: readonly { id: string; qty: number }[] } | ({ intent: LeadIntent; context: string } & LeadDetails)
type Props = {
  endpoint: string
  terms: LeadTerms
  fields: Fields
  attempt: RefObject<LeadAttempt | null>
}

function errorMessage(status: number, error: string, cart: boolean, staging: boolean) {
  if (status === 403 && staging) return 'Проверьте код доступа к тестовой отправке.'
  if (status === 409) return error === 'request_in_progress'
    ? 'Заявка ещё обрабатывается. Подождите немного и повторите отправку с теми же данными.'
    : 'Данные заявки изменились. Напишите нам в Telegram или позвоните.'
  if (status === 422) return cart ? 'Проверьте имя, телефон, согласие и выбранные товары.'
    : 'Проверьте имя, телефон и согласие.'
  if (status === 429) return 'Слишком много попыток. Повторите через минуту.'
  return 'Не удалось подтвердить приём. Повторите отправку с теми же данными или свяжитесь с нами.'
}

export function LeadForm({ endpoint, terms, fields, attempt }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState<LeadReceipt | null>(null)
  const consentId = useId()
  const errorRef = useRef<HTMLParagraphElement>(null)
  const successRef = useRef<HTMLParagraphElement>(null)
  const running = useRef<AbortController | null>(null)
  const cart = !('intent' in fields) || fields.intent === 'order'
  const staging = terms.mode === 'staging'
  const started = useRef(false)
  const marketing = useRef<Awaited<ReturnType<typeof readMarketingAttribution>>>(undefined)
  const [samples, setSamples] = useState<string[]>([])
  const chooseSamples = 'intent' in fields && fields.intent === 'samples' && !fields.items?.length

  useEffect(() => () => running.current?.abort(), [])
  useEffect(() => { if (terms.marketingAttribution) void readMarketingAttribution().then(value => { marketing.current = value }) }, [terms.marketingAttribution])
  useEffect(() => { if (receipt) successRef.current?.focus() }, [receipt])
  useEffect(() => { if (error) errorRef.current?.focus() }, [error])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (running.current) return
    const form = new FormData(event.currentTarget)
    if (form.get('consent') !== 'on' || (chooseSamples && samples.length === 0)) return
    const access = staging ? String(form.get('testAccess') ?? '') : undefined
    const body = JSON.stringify({
      name: String(form.get('name') ?? '').trim(),
      phone: String(form.get('phone') ?? '').trim(),
      email: String(form.get('email') ?? '').trim(),
      comment: String(form.get('comment') ?? '').trim(),
      website: String(form.get('website') ?? ''),
      ...(terms.marketingAttribution && readAnalyticsConsent() === 'accepted' && marketing.current ? { attribution: marketing.current } : {}),
      ...fields,
      ...(chooseSamples ? { items: [...samples].sort().map(id => ({ id, qty: 1 })) } : {}),
      consent: { accepted: true, version: terms.consentVersion },
    })

    if (attempt.current?.body === body && attempt.current.receipt) {
      setReceipt(attempt.current.receipt)
      return
    }
    const controller = new AbortController()
    running.current = controller
    setSubmitting(true)
    setError('')
    try {
      if (attempt.current?.body !== body) attempt.current = { body, key: crypto.randomUUID() }
      const operation = attempt.current
      const result = await postLead(endpoint, operation, controller, access)
      if (!result.receipt) {
        setError(errorMessage(result.status, result.error, cart, staging))
        trackAnalyticsGoal('lead_error')
        return
      }
      operation.receipt = result.receipt
      setReceipt(result.receipt)
      void trackLeadReceipt(result.receipt).then(first => { if (first) trackAnalyticsGoal('lead_submit') })
    } catch {
      trackAnalyticsGoal('lead_error')
      setError(controller.signal.aborted
        ? 'Ответ задержался. Повторите отправку с теми же данными. Это продолжит прежнюю попытку.'
        : 'Не удалось подтвердить приём. Проверьте соединение и повторите отправку с теми же данными.')
    } finally {
      running.current = null
      setSubmitting(false)
    }
  }

  if (receipt) {
    return <p ref={successRef} tabIndex={-1} className="cart-lead-response ym-hide-content" role="status">
      {staging ? 'Тестовый сервер принял заявку.' : 'Заявка принята. Менеджер свяжется с вами, чтобы уточнить детали.'} Номер обращения: {receipt.requestId}
    </p>
  }

  return <form method="post" autoComplete={staging ? "off" : undefined}
    className="cart-lead-form ym-hide-content ym-disable-keys" onSubmit={submit} aria-busy={submitting}
    onChange={() => { if (!started.current) { started.current = true; trackAnalyticsGoal('lead_start') } }}>
    <fieldset disabled={submitting}>
      {cart && <legend>Обсудить подборку</legend>}
      <p>{staging ? 'Тестовая отправка. Используем только тестовые контакты.' : cart
        ? 'Передадим выбранные позиции менеджеру для проверки наличия и стоимости.'
        : 'Укажите контакты, чтобы менеджер мог ответить на ваш запрос.'}</p>
      {chooseSamples && <div className="lead-sample-picker">
        <label htmlFor={consentId + '-sample'}>Выберите материалы для образцов</label>
        <StoreSelect id={consentId + '-sample'} label="Материал для образца" value="" onChange={id => {
          if (id) setSamples(previous => previous.includes(id) ? previous : [...previous, id])
        }}>
          <option value="">Добавить материал</option>
          {products.filter(product => !samples.includes(product.id) && samples.length < 10)
            .map(product => <option key={product.id} value={product.id}>
            {product.name}{product.sku && product.sku !== product.name ? ' · ' + product.sku : ''}
          </option>)}
        </StoreSelect>
        {samples.length > 0 && <ul aria-label="Выбранные образцы">
          {samples.map(id => {
            const product = products.find(item => item.id === id)
            return <li key={id}><button type="button" className="secondary-action"
              onClick={() => setSamples(previous => previous.filter(sample => sample !== id))}
              aria-label={'Убрать из заявки: ' + product?.name}>{product?.name} ×</button></li>
          })}
        </ul>}
      </div>}
      <label>Имя <input className="ym-disable-keys" name="name" autoComplete={staging ? 'off' : 'name'} required minLength={2} maxLength={80}
        readOnly={staging} defaultValue={staging ? 'Тест Декорай' : undefined} /></label>
      <label>Телефон <input className="ym-disable-keys" name="phone" type="tel" autoComplete={staging ? 'off' : 'tel'} required minLength={10} maxLength={32}
        readOnly={staging} defaultValue={staging ? '+12025550101' : undefined} /></label>
      {!staging && <>
        <label>Email (необязательно) <input className="ym-disable-keys" name="email" type="email" autoComplete="email" maxLength={254} /></label>
        <label>Комментарий (необязательно) <textarea className="ym-disable-keys" name="comment" rows={3} maxLength={1000} /></label>
      </>}
      {staging && <label>Код тестового доступа <input className="ym-disable-keys" name="testAccess" type="password" autoComplete="off" maxLength={128} required /></label>}
      <div hidden aria-hidden="true"><input className="ym-disable-keys" name="website" tabIndex={-1} autoComplete="off" /></div>
      <div className="cart-lead-consent">
        <input className="ym-disable-keys" type="checkbox" id={consentId} name="consent" required aria-describedby={consentId + '-document'} />
        <div>
          <label htmlFor={consentId}>Подтверждаю согласие на обработку данных для ответа на заявку.</label>
          <a id={consentId + '-document'} href={terms.consentPath} target="_blank" rel="noopener noreferrer">Текст согласия</a>
        </div>
      </div>
      <button type="submit" disabled={chooseSamples && samples.length === 0} className="btn btn-primary btn-full interactive">
        {submitting ? 'Отправляем…' : error ? 'Повторить отправку' : staging ? 'Отправить тестовую заявку' : 'Отправить заявку'}
      </button>
      {error && <p ref={errorRef} tabIndex={-1} role="alert" className="form-error">{error}</p>}
    </fieldset>
  </form>
}
