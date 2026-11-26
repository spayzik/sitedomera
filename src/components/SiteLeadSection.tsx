import { SocialContacts } from './SocialContacts'
import { InquiryForm } from './LeadProvider'

export function SiteLeadSection({ base }: { base: string }) {
  const fields = { intent: 'consultation', context: '' } as const

  return <section className="site-lead" id="request" aria-labelledby="site-lead-heading">
    <div className="container">
      <div className="site-lead-panel">
        <div className="site-lead-copy">
          <h2 id="site-lead-heading">Обсудим ваш проект</h2>
          <p>Поможем подобрать фактуру, уточнить наличие и рассчитать материалы.</p>
          <SocialContacts base={base} placement="product" />
        </div>
        <InquiryForm fields={fields} />
      </div>
    </div>
  </section>
}
