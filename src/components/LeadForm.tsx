import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from 'react'
import { trackAnalyticsGoal } from '../lib/analytics'
import { postLead, type LeadAttempt, type LeadReceipt, type LeadTerms } from '../lib/leadClient'
import type { LeadIntent } from '../lib/leadIntents'
import './CartLeadForm.css'

type Fields = { items: readonly { id: string; qty: number }[] } | { intent: LeadIntent; context: string }
type Props = {
  endpoint: string
  terms: LeadTerms
  fields: Fields
  attempt: RefObject<LeadAttempt | null>
}

function errorMessage(status: number, error: string, cart: boolean) {
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
  const cart = 'items' in fields

  useEffect(() => () => running.current?.abort(), [])
  useEffect(() => { if (receipt) successRef.current?.focus() }, [receipt])
  useEffect(() => { if (error) errorRef.current?.focus() }, [error])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (running.current) return
    const form = new FormData(event.currentTarget)
    if (form.get('consent') !== 'on') return
    const body = JSON.stringify({
      name: String(form.get('name') ?? '').trim(),
      phone: String(form.get('phone') ?? '').trim(),
      email: String(form.get('email') ?? '').trim(),
      comment: String(form.get('comment') ?? '').trim(),
      website: String(form.get('website') ?? ''),
      ...fields,
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
      const result = await postLead(endpoint, operation, controller)
      if (!result.receipt) {
        setError(errorMessage(result.status, result.error, cart))
        return
      }
      operation.receipt = result.receipt
      setReceipt(result.receipt)
      if (result.status === 201) trackAnalyticsGoal('lead_submit')
    } catch {
      setError(controller.signal.aborted
        ? 'Ответ задержался. Повторите отправку с теми же данными. Это продолжит прежнюю попытку.'
        : 'Не удалось подтвердить приём. Проверьте соединение и повторите отправку с теми же данными.')
    } finally {
      running.current = null
      setSubmitting(false)
    }
  }

  if (receipt) {
    return <p ref={successRef} tabIndex={-1} className="cart-lead-response" role="status">
      Заявка принята. Менеджер свяжется с вами, чтобы уточнить детали. Номер обращения: {receipt.requestId}
    </p>
  }

  return <form className="cart-lead-form ym-hide-content ym-disable-keys" onSubmit={submit} aria-busy={submitting}>
    <fieldset disabled={submitting}>
      {cart && <legend>Обсудить подборку</legend>}
      <p>{cart ? 'Передадим выбранные позиции менеджеру для проверки наличия и стоимости.'
        : 'Укажите контакты, чтобы менеджер мог ответить на ваш запрос.'}</p>
      <label>Имя <input name="name" autoComplete="name" required minLength={2} maxLength={80} /></label>
      <label>Телефон <input name="phone" type="tel" autoComplete="tel" required minLength={10} maxLength={32} /></label>
      {cart && <label>Email (необязательно) <input name="email" type="email" autoComplete="email" maxLength={254} /></label>}
      <label>Комментарий (необязательно) <textarea name="comment" rows={3} maxLength={1000} /></label>
      <div hidden aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" /></div>
      <div className="cart-lead-consent">
        <input type="checkbox" id={consentId} name="consent" required aria-describedby={consentId + '-document'} />
        <div>
          <label htmlFor={consentId}>Даю согласие на обработку персональных данных для ответа на заявку.</label>
          <a id={consentId + '-document'} href={terms.consentPath} target="_blank" rel="noopener noreferrer">Текст согласия</a>
        </div>
      </div>
      <button type="submit" className="btn btn-primary btn-full interactive">
        {submitting ? 'Отправляем…' : error ? 'Повторить отправку' : 'Отправить заявку'}
      </button>
      {error && <p ref={errorRef} tabIndex={-1} role="alert" className="form-error">{error}</p>}
    </fieldset>
  </form>
}
