import { useRef } from 'react'
import { ArrowRight, ArrowUpRight, Phone } from 'lucide-react'
import { CONTACTS } from '../data/products'
import { storefrontImageSize } from '../data/storefrontImageSizes'
import { LeadAction } from '../components/LeadProvider'
import { SocialContacts } from '../components/SocialContacts'
import { inquiryTelegramLink, inquiryWhatsAppLink } from '../lib/contactLinks'
import type { SeoPage } from '../data/seoRoutes'

export function InstallationPage({ page, base }: {
  page: Extract<SeoPage, { copy: unknown }>
  base: string
}) {
  const { copy } = page
  const context = "Монтаж стеновых панелей · Хочу договориться о замере и получить смету"
  const gallery = useRef<HTMLDivElement>(null)
  return <section className="container page-section installation-service">
    <nav className="page-crumbs" aria-label="Хлебные крошки">
      <a href={base}>ДЕКОРАЙ</a><span aria-current="page">Монтаж</span>
    </nav>
    <div className="installation-service-hero">
      <header className="page-intro">
        <p className="eyebrow">Услуги · Москва</p>
        <h1>{page.heading}</h1>
        <p className="lead">Наши мастера приедут на объект, снимут размеры и проверят стены. До начала монтажа согласуем, где будут стыки, чем оформить углы и сколько будет стоить работа.</p>
        <div className="page-links">
          <LeadAction className="btn btn-primary interactive" intent="installation" context={context}>
            Договориться о замере <ArrowUpRight size={16} aria-hidden="true" />
          </LeadAction>
        </div>
        <div className="installation-contact">
          <span>Связаться</span>
          <SocialContacts base={base} placement="product" hidePhone drafts={{
            telegram: inquiryTelegramLink('installation', context),
            whatsapp: inquiryWhatsAppLink('installation', context),
          }} />
          <a className="secondary-action" href={'tel:' + CONTACTS.phoneRaw}><Phone size={15} aria-hidden="true" /> Позвонить</a>
        </div>
      </header>
      {copy.image && <figure className="installation-service-photo">
        <img src={base + copy.image} {...storefrontImageSize(copy.image)} alt="Мастера устанавливают стеновые панели" decoding="async" />
        <figcaption>{copy.imageCaption}</figcaption>
      </figure>}
    </div>
    <section className="installation-service-process" aria-labelledby="installation-process">
      <h2 id="installation-process">Как проходит монтаж</h2>
      <div className="installation-service-steps">
        {copy.blocks.map(({ heading, text }, index) =>
          <section key={heading}><span aria-hidden="true" className="installation-step-number">{String(index + 1).padStart(2, '0')}</span><h3>{heading}</h3><p>{text}</p></section>
        )}
      </div>
    </section>
    <section className="installation-examples" aria-labelledby="installation-examples-heading">
      <div className="installation-examples-head">
        <div><h2 id="installation-examples-heading">Как панели смотрятся в интерьере</h2><p>Визуализации применения материалов ДЕКОРАЙ.</p></div>
        <div className="installation-carousel-nav">
          {[-1, 1].map(direction => <button className="secondary-action" key={direction} type="button"
            aria-label={direction < 0 ? 'Предыдущий пример' : 'Следующий пример'}
            onClick={() => {
              const rail = gallery.current
              if (!rail) return
              const left = rail.getBoundingClientRect().left
              const stops = Array.from(rail.querySelectorAll('figure'), card => card.getBoundingClientRect().left - left + rail.scrollLeft)
              const next = direction > 0 ? stops.find(stop => stop > rail.scrollLeft + 2)
                : stops.findLast(stop => stop < rail.scrollLeft - 2)
              rail.scrollTo({ left: next ?? (direction > 0 ? rail.scrollWidth : 0) })
            }}>
            <ArrowRight style={{ rotate: direction < 0 ? '180deg' : undefined }} size={17} aria-hidden="true" />
          </button>)}
        </div>
      </div>
      <div ref={gallery} className="installation-gallery" tabIndex={0} aria-label="Примеры отделки">
        {([['living', 'Панели и рейки в гостиной'], ['bedroom', 'Акцентная стена в спальне'], ['dining', 'Отделка обеденной зоны'], ['fabric', 'Тканевая фактура при боковом свете']] as const).map(([scene, caption]) =>
          <figure key={scene}><img src={base + 'catalog/rooms/interior-' + scene + '.webp'} width={1122} height={1402}
            alt={caption} loading="lazy" decoding="async" /><figcaption>{caption}</figcaption></figure>)}
      </div>
    </section>
    <nav className="page-links installation-service-links" aria-label="Материалы для монтажа">
      {copy.links?.map(link => <a className="secondary-action" key={link.path} href={base + link.path.slice(1)}>{link.label} <ArrowRight size={14} aria-hidden="true" /></a>)}
    </nav>
  </section>
}
