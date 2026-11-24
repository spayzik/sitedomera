import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { contactLinks, inquiryTelegramLink, inquiryWhatsAppLink } from '../lib/contactLinks'
import { fetchLeadTerms, leadEndpoint, type LeadAttempt, type LeadTerms } from '../lib/leadClient'
import { leadContextLimit, leadIntents, type LeadDetails, type LeadIntent } from '../lib/leadIntents'
import { LeadContext, useLeadService } from '../lib/leadState'
import { trackAnalyticsGoal } from '../lib/analytics'
import { useDialog } from '../lib/useDialog'
import { LeadForm } from './LeadForm'
import './LeadDialog.css'

type Inquiry = { intent: LeadIntent; context: string; details?: LeadDetails; fromHash?: boolean }

export function LeadProvider({ children }: { children: ReactNode }) {
  const [terms, setTerms] = useState<LeadTerms | null>(null)
  const [loading, setLoading] = useState(Boolean(leadEndpoint))
  const [retry, setRetry] = useState(0)
  const [request, setRequest] = useState<Inquiry | null>(null)
  const opener = useRef<HTMLElement | null>(null)
  const attempt = useRef<LeadAttempt | null>(null)
  const dialog = useDialog(Boolean(request), close)

  useEffect(() => {
    if (!leadEndpoint) return
    const controller = new AbortController()
    let mounted = true
    void fetchLeadTerms(leadEndpoint, controller).then(available => {
      if (!mounted) return
      setTerms(available)
      setLoading(false)
    })
    return () => {
      mounted = false
      controller.abort()
    }
  }, [retry])

  useEffect(() => {
    const readHash = () => {
      if (window.location.hash.toLowerCase() === '#lead') {
        setRequest({ intent: 'consultation', context: '', fromHash: true })
      } else {
        setRequest(current => current?.fromHash ? null : current)
      }
    }
    readHash()
    window.addEventListener('hashchange', readHash)
    return () => window.removeEventListener('hashchange', readHash)
  }, [])

  function open(intent: LeadIntent, context = '', details?: LeadDetails) {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setRequest({ intent, context: context.trim().slice(0, leadContextLimit), details })
    if (intent === 'samples') trackAnalyticsGoal('sample_request')
    if (intent === 'installation') trackAnalyticsGoal('installation_request')
    if (intent === 'wholesale' || intent === 'designer') trackAnalyticsGoal('b2b_request')
  }

  function close() {
    setRequest(null)
    if (request?.fromHash && window.location.hash.toLowerCase() === '#lead') {
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
    }
    if (opener.current) {
      const previous = opener.current
      opener.current = null
      window.requestAnimationFrame(() => { if (previous.isConnected) previous.focus({ preventScroll: true }) })
    }
  }

  const formAvailable = request && leadEndpoint && terms?.intents.includes(request.intent)
  const whatsapp = request && inquiryWhatsAppLink(request.intent, request.context)

  return <LeadContext.Provider value={{ terms, open }}>
    {children}
    {request && createPortal(
      <div className="lead-layer" onClick={event => { if (event.target === event.currentTarget) close() }}>
        <div className="lead-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="lead-dialog-title" tabIndex={-1}>
          <header className="lead-dialog-head">
            <h2 id="lead-dialog-title">{leadIntents[request.intent].title}</h2>
            <button type="button" className="icon-btn" onClick={close} aria-label="Закрыть заявку">
              <X size={20} aria-hidden="true" />
            </button>
          </header>
          {request.context && <p className="lead-dialog-context ym-hide-content">{request.context}</p>}
          {formAvailable && leadEndpoint && terms
            ? <LeadForm key={request.intent} endpoint={leadEndpoint} terms={terms} attempt={attempt}
                fields={{ intent: request.intent, context: request.context, ...request.details }} />
            : <>
              <p className="lead-dialog-note" role="status">{loading
                ? 'Проверяем доступность формы…'
                : 'Заявка через сайт сейчас недоступна. Напишите нам в Telegram или позвоните.'}</p>
              {leadEndpoint && !terms && !loading && <button type="button" className="secondary-action"
                onClick={() => { setLoading(true); setRetry(attemptNumber => attemptNumber + 1) }}>
                Проверить ещё раз
              </button>}
            </>}
          <div className="lead-dialog-links">
            <a className="contact-inline-phone" href={inquiryTelegramLink(request.intent, request.context)}
              target="_blank" rel="noopener noreferrer">Написать в Telegram</a>
            {whatsapp && <a className="contact-inline-phone" href={whatsapp}
              target="_blank" rel="noopener noreferrer">Написать в WhatsApp</a>}
            <a className="contact-inline-phone" href={contactLinks.phone}>Позвонить {contactLinks.phoneLabel}</a>
          </div>
        </div>
      </div>, document.body,
    )}
  </LeadContext.Provider>
}

type ActionProps = {
  intent: LeadIntent
  context?: string
  details?: LeadDetails
  className?: string
  'aria-label'?: string
  children?: ReactNode
}

export function LeadAction({ intent, context, details, children, ...attributes }: ActionProps) {
  const service = useLeadService()
  const content = children ?? leadIntents[intent].title
  return <a {...attributes} href={inquiryTelegramLink(intent, context)} target="_blank" rel="noopener noreferrer"
    aria-haspopup={service ? 'dialog' : undefined} onClick={event => {
      if (!service || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      service.open(intent, context, details)
    }}>
    {content}
  </a>
}
