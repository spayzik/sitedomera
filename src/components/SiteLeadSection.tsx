import { useRef } from 'react'
import { SocialContacts } from './SocialContacts'
import { LeadForm } from './LeadForm'
import { leadEndpoint, type LeadAttempt } from '../lib/leadClient'
import { useLeadService } from '../lib/leadState'

export function SiteLeadSection({ base }: { base: string }) {
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
          <SocialContacts base={base} placement="product" />
        </div>
        {consultation && terms && leadEndpoint &&
          <LeadForm endpoint={leadEndpoint} terms={terms} fields={fields} attempt={attempt} />}
      </div>
    </div>
  </section>
}
