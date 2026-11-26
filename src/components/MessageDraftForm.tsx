import { useEffect, useRef, useState, type FormEvent } from 'react'
import { products } from '../data/products'
import { contactLinks } from '../lib/contactLinks'
import { leadIntents, type LeadDetails, type LeadIntent } from '../lib/leadIntents'
import './CartLeadForm.css'

export type InquiryFields = { intent: LeadIntent; context: string } & LeadDetails

export function MessageDraftForm({ fields }: { fields: InquiryFields }) {
  const messageInput = useRef<HTMLTextAreaElement>(null)
  const draftInput = useRef<HTMLTextAreaElement>(null)
  const [message, setMessage] = useState('')
  const [ready, setReady] = useState(false)
  const [draft, setDraft] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => setReady(true), [])
  useEffect(() => { if (draft) draftInput.current?.focus() }, [draft])

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const comment = message.trim()
    if (!comment && !fields.items?.length) return
    const items = fields.items?.map(({ id, qty }) => {
      const product = products.find(item => item.id === id)
      return product && [product.name, product.sku !== product.name && product.sku, qty + ' ' + product.unit].filter(Boolean).join(' · ')
    }).filter(Boolean)
    setCopied(false)
    setDraft([leadIntents[fields.intent].message, fields.context, items?.join('\n'), comment].filter(Boolean).join('\n\n'))
  }

  return <form className="cart-lead-form message-draft-form ym-hide-content ym-disable-keys" onSubmit={prepare}>
    <fieldset disabled={!ready}>
      {!draft && <>
        <p>Подготовьте сообщение и отправьте его менеджеру в удобном мессенджере.</p>
        <label>{fields.items?.length ? 'Комментарий к подборке (необязательно)' : 'Ваше сообщение'}
          <textarea ref={messageInput} value={message} onChange={event => setMessage(event.target.value)}
            required={!fields.items?.length} maxLength={1000} rows={3} placeholder={fields.intent === 'samples'
            ? 'Укажите названия или артикулы образцов'
            : 'Расскажите, чем можем помочь'} />
        </label>
        <button type="submit" className="btn btn-primary btn-full interactive">Подготовить сообщение</button>
      </>}
      {draft && <div className="message-draft-result">
        <label>Готовое сообщение<textarea ref={draftInput} readOnly value={draft} rows={4} onFocus={event => event.currentTarget.select()} /></label>
        <button type="button" className="secondary-action" onClick={async () => {
          try { await navigator.clipboard.writeText(draft); setCopied(true) }
          catch { setCopied(false) }
        }}>Скопировать сообщение</button>
        <p role="status">{copied ? 'Скопировано. Вставьте сообщение в чат и отправьте его.' : 'Скопируйте сообщение или выделите его вручную.'}</p>
        <div className="lead-dialog-links">
          <a className="contact-inline-phone" href={contactLinks.telegram} target="_blank" rel="noreferrer">Открыть Telegram</a>
          {contactLinks.whatsapp && <a className="contact-inline-phone" href={contactLinks.whatsapp} target="_blank" rel="noreferrer">Открыть WhatsApp</a>}
        </div>
        <button type="button" className="secondary-action" onClick={() => {
          setDraft('')
          window.requestAnimationFrame(() => messageInput.current?.focus())
        }}>Изменить сообщение</button>
      </div>}
    </fieldset>
  </form>
}
