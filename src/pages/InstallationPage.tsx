import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { CONTACTS } from '../data/products'
import { storefrontImageSize } from '../data/storefrontImageSizes'
import { buildTelegramDraftUrl } from '../lib/telegramLink'
import type { SeoPage } from '../data/seoRoutes'

const measurementLink = buildTelegramDraftUrl(CONTACTS.telegram,
  'Здравствуйте! Хочу договориться о замере и получить смету на монтаж панелей ДЕКОРАЙ. Адрес объекта: ')

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
        <h1>{page.heading}</h1>
        <p className="lead">Сами выезжаем на замер и берём на себя монтаж. Подбираем крепление под ваш материал, согласовываем раскладку и готовим смету до начала работ.</p>
        <div className="page-links">
          <a className="btn btn-primary interactive" href={measurementLink} target="_blank" rel="noreferrer">
            Договориться о замере <ArrowUpRight size={16} aria-hidden="true" />
          </a>
          <a href={'tel:' + CONTACTS.phoneRaw}>Позвонить</a>
        </div>
      </header>
      {copy.image && <figure className="installation-service-photo">
        <img src={base + copy.image} {...storefrontImageSize(copy.image)} alt="Мастера устанавливают стеновые панели" decoding="async" />
        <figcaption>{copy.imageCaption}</figcaption>
      </figure>}
    </div>
    <section className="installation-service-process" aria-labelledby="installation-process">
      <h2 id="installation-process">Что берём на себя</h2>
      <div className="installation-service-steps">
        {copy.blocks.map(({ heading, text }) =>
          <section key={heading}><h3>{heading}</h3><p>{text}</p></section>
        )}
      </div>
    </section>
    <nav className="page-links installation-service-links" aria-label="Материалы для монтажа">
      {copy.links?.map(link => <a key={link.path} href={base + link.path.slice(1)}>{link.label} <ArrowRight size={14} aria-hidden="true" /></a>)}
    </nav>
  </section>
}
