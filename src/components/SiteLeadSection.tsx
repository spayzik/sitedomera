import { useRef } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { LeadForm } from './LeadForm'
import { contactLinks, inquiryTelegramLink } from '../lib/contactLinks'
import { leadEndpoint, leadFormPreview, type LeadAttempt } from '../lib/leadClient'
import { useLeadService } from '../lib/leadState'

export function SiteLeadSection() {
  const attempt = useRef<LeadAttempt | null>(null)
  const terms = useLeadService()?.terms
  const consultation = terms?.intents.includes('consultation')
  const fields = { intent: 'consultation', context: '' } as const

  return <section className="site-lead" id="request" aria-labelledby="site-lead-heading">
    <div className="container">
      <div className="site-lead-panel">
        <div className="site-lead-copy">
          <h2 id="site-lead-heading">Обсудим ваш проект</h2>
          <p>Поможем подобрать фактуру, уточнить наличие и рассчитать материалы.</p>
          <div className="site-lead-contacts">
            <a className="secondary-action" href={inquiryTelegramLink('consultation')} target="_blank" rel="noreferrer">
              Написать в Telegram <ArrowUpRight size={15} aria-hidden="true" />
            </a>
            <a className="secondary-action" href={contactLinks.phone}>{contactLinks.phoneLabel}</a>
          </div>
        </div>
        {leadFormPreview
          ? <LeadForm fields={fields} attempt={attempt} />
          : consultation && terms && leadEndpoint
            ? <LeadForm endpoint={leadEndpoint} terms={terms} fields={fields} attempt={attempt} />
            : null}
      </div>
    </div>
  </section>
}
