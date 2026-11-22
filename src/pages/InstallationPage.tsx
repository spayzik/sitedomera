import { ArrowRight, ArrowUpRight, Phone } from 'lucide-react'
import { CONTACTS } from '../data/products'
import { storefrontImageSize } from '../data/storefrontImageSizes'
import { LeadAction } from '../components/LeadProvider'
import type { SeoPage } from '../data/seoRoutes'

export function InstallationPage({ page, base }: {
  page: Extract<SeoPage, { copy: unknown }>
  base: string
}) {
  const { copy } = page
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
          <LeadAction className="btn btn-primary interactive" intent="consultation" context="Монтаж стеновых панелей · Хочу договориться о замере и получить смету">
            Договориться о замере <ArrowUpRight size={16} aria-hidden="true" />
          </LeadAction>
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
    <nav className="page-links installation-service-links" aria-label="Материалы для монтажа">
      {copy.links?.map(link => <a className="secondary-action" key={link.path} href={base + link.path.slice(1)}>{link.label} <ArrowRight size={14} aria-hidden="true" /></a>)}
    </nav>
  </section>
}
