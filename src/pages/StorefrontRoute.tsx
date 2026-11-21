import { storefrontImageSize } from '../data/storefrontImageSizes'
import { useRoute } from '../router'
import { CONTACTS } from '../data/products'
import { seoPages, type SeoPage } from '../data/seoRoutes'
import { MapEmbed } from '../components/MapEmbed'
import { Calculator } from '../components/Calculator'
import { Reviews } from '../components/Reviews'
import { Showroom } from '../components/Showroom'
import { buildTelegramDraftUrl } from '../lib/telegramLink'
import { HomePage } from './HomePage'
import { CatalogPage } from './CatalogPage'
import { ProductPage } from './ProductPage'
import { OfferPage } from './OfferPage'

const actionMap: Record<string, [string, string]> = {
  '/montazh/': ['/kalkulyator/', 'Рассчитать количество листов'],
  '/dostavka/': [buildTelegramDraftUrl(CONTACTS.telegram, 'Здравствуйте! Хочу уточнить условия доставки материалов ДЕКОРАЙ.'), 'Уточнить доставку'],
  '/showroom/': [CONTACTS.mapOrganization, 'Открыть в Яндекс Картах'],
  '/kontakty/': ['tel:' + CONTACTS.phoneRaw, 'Позвонить ' + CONTACTS.phone],
  '/proekty/': ['/catalog/derevo/', 'Смотреть древесные фактуры'],
  '/opt/': [buildTelegramDraftUrl(CONTACTS.telegram, 'Здравствуйте! Хочу обсудить поставку материалов ДЕКОРАЙ для объекта.'), 'Обсудить поставку'],
  '/dizayneram/': ['/showroom/', 'Посмотреть образцы в шоуруме'],
  '/obraztsy/': [buildTelegramDraftUrl(CONTACTS.telegram, 'Здравствуйте! Хочу запросить образцы ДЕКОРАЙ. Материалы или артикулы: '), 'Запросить образцы в Telegram'],
}

const href = (base: string, path: string) => path.startsWith('/') ? base + path.slice(1) : path

export function StorefrontRoute({ page, base, path }: { page?: SeoPage; base: string; path: string }) {
  const legacy = useRoute()
  if (page?.kind === 'home') return legacy === '/offer' ? <OfferPage /> : <HomePage />
  if (path === '/offer/') return <OfferPage />
  if (!page) return <section className="container page-section">
    <h1>Страница не найдена</h1><p>Проверьте адрес или перейдите в каталог материалов.</p>
    <a className="btn btn-outline interactive" href={base + 'catalog/'}>Каталог</a>
  </section>
  if (page.kind === 'catalog' || page.kind === 'category' || page.kind === 'selection') return <CatalogPage page={page} base={base} />
  if (page.kind === 'product') return <ProductPage product={page.product} base={base} />

  const action = actionMap[page.path]
  const venue = page.path === '/kontakty/' || page.path === '/showroom/'
  const copy = 'copy' in page ? page.copy : undefined
  const articles = page.kind === 'articles' ? seoPages.filter(item => item.kind === 'article') : []
  const calculator = page.path === '/kalkulyator/'

  return <div className="container page-section">
    <nav className="page-crumbs" aria-label="Хлебные крошки"><a href={base}>ДЕКОРАЙ</a>
      {page.kind === 'article' && <a href={base + 'stati/'}>Статьи</a>}<span aria-current="page">{page.heading}</span>
    </nav>
    <header className="page-intro">
      <h1>{page.heading}</h1><p className="lead">{page.description}</p>
      {action && <a className="btn btn-outline interactive" href={href(base, action[0])}>{action[1]}</a>}
    </header>
    {calculator && <Calculator standalone />}
    {venue && <Showroom base={base} />}
    {page.path === '/otzyvy/' && <>
      <Reviews assetBase={base} compact />
      <section className="page-map-reviews"><h2>Отзывы на Яндекс Картах</h2>
        <MapEmbed title="Отзывы об организации на Яндекс Картах" src={'https://yandex.ru/maps-reviews-widget/' + CONTACTS.mapOrganizationId + '?comments'} height={520} />
        <a href={CONTACTS.mapOrganization}>Открыть карточку организации на Яндекс Картах</a>
      </section>
    </>}
    {copy?.image && <figure className="page-editorial-image">
      <img src={base + copy.image} {...storefrontImageSize(copy.image)} alt={copy.imageCaption ?? page.heading} decoding="async" loading="lazy"
        srcSet={copy.imageSmall ? base + copy.imageSmall + ' 720w, ' + base + copy.image + ' 1440w' : undefined}
        sizes="(max-width: 768px) 100vw, 48rem" />
      {copy.imageCaption && <figcaption>{copy.imageCaption}</figcaption>}
    </figure>}
    {copy && <div className="page-copy">{copy.blocks.map(({ heading, text }) =>
      <section key={heading}><h2>{heading}</h2><p>{text}</p></section>)}</div>}
    {articles.length > 0 && <div className="page-copy">{articles.map(article =>
      <section key={article.path}><h2><a href={href(base, article.path)}>{article.heading}</a></h2><p>{article.description}</p></section>)}</div>}
    <div className="page-links">
      {copy?.links?.filter(({ path }) => path !== action?.[0] && !(action && path === '/#lead') && !(venue && path === '/#showroom'))
        .map(link => <a key={link.path} href={href(base, link.path)}>{link.label}</a>)}
      {page.kind === 'article' && page.path !== '/stati/kak-sravnit-stoimost-otdelki/' &&
        <a href={base + 'stati/kak-sravnit-stoimost-otdelki/'}>Сравнить стоимость материалов</a>}
    </div>
  </div>
}
