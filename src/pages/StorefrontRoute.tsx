import { storefrontImageSize } from '../data/storefrontImageSizes'
import { CONTACTS } from '../data/products'
import type { SeoPage } from '../data/seoRoutes'
import { MapEmbed } from '../components/MapEmbed'
import { Calculator } from '../components/Calculator'
import { Reviews } from '../components/Reviews'
import { Showroom } from '../components/Showroom'
import { LeadAction } from '../components/LeadProvider'
import type { LeadIntent } from '../lib/leadIntents'
import { HomePage } from './HomePage'
import { CatalogPage } from './CatalogPage'
import { ProductPage } from './ProductPage'
import { OfferPage } from './OfferPage'
import { ArticlePage, JournalPage } from './JournalPage'
import { InstallationPage } from './InstallationPage'

const linkActions: Record<string, [string, string]> = {
  '/kontakty/': ['tel:' + CONTACTS.phoneRaw, 'Позвонить ' + CONTACTS.phone],
  '/proekty/': ['/catalog/derevo/', 'Смотреть древесные фактуры'],
}

const inquiryActions: Record<string, [LeadIntent, string]> = {
  '/dostavka/': ['delivery', 'Уточнить доставку'],
  '/opt/': ['wholesale', 'Обсудить поставку'],
  '/dizayneram/': ['designer', 'Узнать условия сотрудничества'],
  '/obraztsy/': ['samples', 'Запросить образцы'],
}

const href = (base: string, path: string) => path.startsWith('/') ? base + path.slice(1) : path

export function StorefrontRoute({ page, base, path }: { page?: SeoPage; base: string; path: string }) {
  if (page?.kind === 'home') return <HomePage />
  if (path === '/usloviya-priobreteniya/') return <OfferPage base={base} />
  if (!page) return <section className="container page-section">
    <h1>Страница не найдена</h1><p>Проверьте адрес или перейдите в каталог материалов.</p>
    <a className="btn btn-outline interactive" href={base + 'catalog/'}>Каталог</a>
  </section>
  if (page.kind === 'catalog' || page.kind === 'category' || page.kind === 'selection') return <CatalogPage page={page} base={base} />
  if (page.kind === 'product') return <ProductPage product={page.product} base={base} />

  if (page.kind === 'article') return <ArticlePage page={page} base={base} />
  if (page.kind === 'articles') return <JournalPage page={page} base={base} />
  if (page.path === '/montazh/' && 'copy' in page) return <InstallationPage page={page} base={base} />

  if (page.path === '/showroom/') return <div className="container page-section showroom-route">
    <nav className="page-crumbs" aria-label="Хлебные крошки"><a href={base}>ДЕКОРАЙ</a><span aria-current="page">Шоурум</span></nav>
    <Showroom base={base} heading={page.heading} />
  </div>

  const action = linkActions[page.path]
  const inquiry = inquiryActions[page.path]
  const venue = page.path === '/kontakty/'
  const copy = 'copy' in page ? page.copy : undefined
  const calculator = page.path === '/kalkulyator/'

  return <div className="container page-section">
    <nav className="page-crumbs" aria-label="Хлебные крошки"><a href={base}>ДЕКОРАЙ</a>
      <span aria-current="page">{page.heading}</span>
    </nav>
    <header className="page-intro">
      <h1>{page.heading}</h1><p className="lead">{page.description}</p>
      {action && <a className="btn btn-outline interactive" href={href(base, action[0])}>{action[1]}</a>}
      {inquiry && <LeadAction className="btn btn-outline interactive" intent={inquiry[0]}>{inquiry[1]}</LeadAction>}
    </header>
    {calculator && <Calculator standalone base={base} />}
    {venue && <Showroom base={base} />}
    {page.path === '/otzyvy/' && <>
      <Reviews assetBase={base} compact />
      <section className="page-map-reviews"><h2>Отзывы на Яндекс Картах</h2>
        <MapEmbed title="Отзывы об организации на Яндекс Картах" src={'https://yandex.ru/maps-reviews-widget/' + CONTACTS.mapOrganizationId + '?comments'} height={520} />
        <a href={CONTACTS.mapOrganization}>Открыть карточку организации на Яндекс Картах</a>
      </section>
    </>}
    {copy && <>
      {copy.image && <figure className="page-editorial-image">
        <img src={base + copy.image} {...storefrontImageSize(copy.image)} alt={copy.imageCaption ?? page.heading} decoding="async" loading="lazy"
          srcSet={copy.imageSmall ? base + copy.imageSmall + ' 720w, ' + base + copy.image + ' 1440w' : undefined}
          sizes="(max-width: 768px) 100vw, 48rem" />
        {copy.imageCaption && <figcaption>{copy.imageCaption}</figcaption>}
      </figure>}
      <div className="page-copy">{copy.blocks.map(({ heading, text }) =>
        <section key={heading}><h2>{heading}</h2><p>{text}</p></section>)}</div>
    </>}
    <div className="page-links">
      {copy?.links?.filter(({ path }) => path !== action?.[0] && !((action || inquiry) && path === '/#lead') && !(venue && path === '/#showroom'))
        .map(link => <a key={link.path} className={calculator ? 'secondary-action' : undefined} href={href(base, link.path)}>{link.label}</a>)}
    </div>
  </div>
}
