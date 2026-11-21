import { createHash } from 'node:crypto'
import { CONTACTS, collections, faq, formatDimensions, productDetails, products } from '../src/data/products.ts'
import { productDescription, productEditorialNote, relatedProducts, suggestedComplements } from '../src/lib/productPresentation.ts'
import { sheetPricePerSquareMeter } from '../src/lib/calculator.ts'
import { buildTelegramDraftUrl, formatProductTelegramMessage } from '../src/lib/telegramLink.ts'
import { canonicalUrl, categoryPath, productPath, seoAssetPrefix, seoPages } from '../src/data/seoRoutes.ts'

export const escape = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character])

const currency = new Intl.NumberFormat('ru-RU')
const formatPrice = product => currency.format(product.priceRub) + ' ₽/' + (product.unit === 'шт' ? 'шт.' : 'лист')
const htmlPrice = product => escape(formatPrice(product))
const assessment = product => {
  const amount = sheetPricePerSquareMeter(product)
  return amount === null ? '' : `<span class="seo-area-price">${currency.format(amount)} ₽/м²</span>`
}

const pageFor = path => seoPages.find(page => page.path === path)
const ogCover = 'catalog/og-cover.jpg'
const categoryImage = id => 'catalog/categories/carousel-2026-' + id + '.webp'
const linkPath = (path, prefix) => /^(?:https:\/\/|tel:)/.test(path) ? path : path === '/' ? prefix : prefix + path.slice(1)
const anchor = (path, label, prefix) => `<a href="${escape(linkPath(path, prefix))}">${escape(label)}</a>`
const imageDimensions = (path, images) => {
  const image = images?.get(path)
  return image ? ' width="' + image.width + '" height="' + image.height + '"' : ''
}
const picture = (path, alt, prefix, lazy = true, images) =>
  `<img src="${escape(prefix + path)}" alt="${escape(alt)}"${lazy ? ' loading="lazy"' : ''} decoding="async"${imageDimensions(path, images)}>`

const contactLinks = `<a href="tel:${escape(CONTACTS.phoneRaw)}">${escape(CONTACTS.phone)}</a>`
function crumbs(page) {
  if (page.kind === 'category' || page.kind === 'selection') return [['/', CONTACTS.brand], ['/catalog/', 'Каталог'], [page.path, page.heading]]
  if (page.kind === 'product') {
    const category = categoryPath(page.product.categoryId)
    return [['/', CONTACTS.brand], ['/catalog/', 'Каталог'], [category, pageFor(category).heading], [page.path, page.heading]]
  }
  if (page.kind === 'article') return [['/', CONTACTS.brand], ['/stati/', 'Статьи'], [page.path, page.heading]]
  return [['/', CONTACTS.brand], [page.path, page.heading]]
}

function breadcrumbs(page, prefix) {
  const parts = crumbs(page)
  return `<nav class="seo-crumbs" aria-label="Хлебные крошки">${parts.map(([path, label], index) =>
    index === parts.length - 1 ? `<span aria-current="page">${escape(label)}</span>` : anchor(path, label, prefix)).join('')}</nav>`
}

function categoryLinks(prefix) {
  return `<ul class="seo-link-grid">${collections.map(category =>
    `<li>${anchor(categoryPath(category.id), category.name, prefix)}<span>${category.count}</span></li>`).join('')}</ul>`
}

const stockLabel = product => '<p class="seo-stock" data-stock-id="' + escape(product.id) + '">Наличие уточняется</p>'

function listing(items, prefix, images, interactive = false, ui) {
  if (ui) return `<ul class="grid-arch catalog-page-grid seo-material-grid"${interactive ? ' data-catalog-list' : ''}>${items.map(product =>
    '<li' + (interactive ? ' data-catalog-product="' + escape(product.id) + '"' : '') + '>' +
    ui.renderCard({ product, base: prefix, detailsHref: linkPath(productPath(product), prefix),
      intrinsic: images?.get(product.image), interactive }) + '</li>').join('')}</ul>`
  return `<ul class="seo-cards"${interactive ? ' data-catalog-list' : ''}>${items.map(product => `<li class="seo-product-card"${interactive ? ' data-catalog-product="' + escape(product.id) + '"' : ''}>
    <a href="${escape(linkPath(productPath(product), prefix))}">
      ${picture(product.image, '', prefix, true, images)}
      <strong>${escape(product.name)}</strong>
    </a>
    <p class="seo-card-meta">${product.sku && product.name !== product.sku ? escape(product.sku) + ' · ' : ''}${escape(formatDimensions(product))}</p>
    <p class="seo-price">${htmlPrice(product)} ${assessment(product)}</p>${stockLabel(product)}
    ${interactive ? '<div data-catalog-actions="' + escape(product.id) + '"></div>' : ''}
  </li>`).join('')}</ul>`
}

function curatedFaq() {
  return faq.filter(({ q }) => [
    'Какие материалы и размеры есть в каталоге?', 'Как монтируются материалы?',
  ].includes(q)).concat([
    { q: 'Как посмотреть материалы вживую?', a: `Шоурум находится по адресу ${CONTACTS.address}. ${CONTACTS.hours}.` },
    { q: 'Как узнать стоимость отделки стены?', a: 'Выберите листовой материал, измерьте стену и проёмы. В калькуляторе можно получить число листов и ориентировочную стоимость по цене выбранной позиции.' },
  ])
}

function home(page, prefix, images) {
  return `<div class="seo-home-hero">
    ${picture('catalog/hero/hero.webp', '', prefix, false, images)}
    <div><h1>${escape(page.heading)}</h1><p>${escape(page.description)}</p>
    <p>${products.length} позиций · ${collections.length} категорий</p>
    <div class="seo-actions">${anchor('/catalog/', 'Открыть каталог', prefix)}${anchor('/kalkulyator/', 'Рассчитать расход', prefix)}</div></div>
  </div>
  <section><h2>Фактуры и материалы</h2>${categoryLinks(prefix)}</section>
  <section><h2>Перед покупкой</h2><div class="seo-actions">
    ${anchor('/montazh/', 'Подготовка к монтажу', prefix)}${anchor('/dostavka/', 'Доставка и оплата', prefix)}
    ${anchor('/showroom/', 'Посмотреть материалы вживую', prefix)}${anchor('/obraztsy/', 'Запросить образцы', prefix)}${anchor('/stati/', 'Практические статьи', prefix)}
  </div></section>
  <section><h2>Ответы на вопросы</h2>${curatedFaq().map(({ q, a }) =>
    `<details><summary>${escape(q)}</summary><p>${escape(a)}</p></details>`).join('')}</section>`
}

const productScenes = {
  wood: ['bedroom', 'dining'],
  slats: ['living', 'bedroom'],
  fabric: ['fabric'],
  metal: ['metal'],
}
const sceneCaptions = {
  bedroom: 'Акцентная стена в спальне',
  dining: 'Отделка обеденной зоны',
  living: 'Рейки в гостиной',
  metal: 'Металлическая фактура с подсветкой',
  fabric: 'Тканевая фактура в гостиной',
}

const commercialActions = {
  '/montazh/': ['/kalkulyator/', 'Рассчитать количество листов'],
  '/dostavka/': [buildTelegramDraftUrl(CONTACTS.telegram, 'Здравствуйте! Хочу уточнить условия доставки материалов ДЕКОРАЙ.'), 'Уточнить доставку'],
  '/showroom/': [CONTACTS.mapOrganization, 'Открыть в Яндекс Картах'],
  '/kontakty/': ['tel:' + CONTACTS.phoneRaw, 'Позвонить ' + CONTACTS.phone],
  '/proekty/': ['/catalog/derevo/', 'Смотреть древесные фактуры'],
  '/opt/': [buildTelegramDraftUrl(CONTACTS.telegram, 'Здравствуйте! Хочу обсудить поставку материалов ДЕКОРАЙ для объекта.'), 'Обсудить поставку'],
  '/dizayneram/': ['/showroom/', 'Посмотреть образцы в шоуруме'],
  '/obraztsy/': [buildTelegramDraftUrl(CONTACTS.telegram, 'Здравствуйте! Хочу запросить образцы ДЕКОРАЙ. Материалы или артикулы: '), 'Запросить образцы в Telegram'],
  '/otzyvy/': [CONTACTS.avito, 'Открыть отзывы на Авито'],
}

function productBody(product, prefix, images, ui) {
  const similar = relatedProducts(product, products)
  const complements = suggestedComplements(product, products)
  const calculator = '/kalkulyator/?material=' + encodeURIComponent(product.id)
  const category = collections.find(item => item.id === product.categoryId)
  const telegram = buildTelegramDraftUrl(CONTACTS.telegram, formatProductTelegramMessage(product, category.name))
  const samples = buildTelegramDraftUrl(CONTACTS.telegram, [
    'Здравствуйте! Хочу запросить образец.',
    `Материал: ${product.name}`,
    ...(product.sku ? [`Артикул: ${product.sku}`] : []),
    `Коллекция: ${category.name}`,
  ].join('\n'))
  const scenes = productScenes[product.categoryId] ?? []
  return `<div class="seo-product-detail${scenes.length ? ' has-scenes' : ''}">
    <figure class="seo-material"><a class="seo-sample seo-image-link" href="${escape(prefix + product.image)}" aria-label="${escape('Открыть образец: ' + product.name)}"><img src="${escape(prefix + product.image)}" alt="${escape(product.name + ' — образец фактуры')}"
      decoding="async" fetchpriority="high"${imageDimensions(product.image, images)}></a><figcaption>Образец материала</figcaption></figure>
    ${scenes.length ? `<aside class="seo-room-scenes" aria-label="Идеи для коллекции">
      ${scenes.map(scene => {
        const original = prefix + 'catalog/rooms/interior-' + scene + '.webp'
        const compact = prefix + 'catalog/rooms/interior-' + scene + '-480.webp'
        return `<figure><a class="seo-image-link" href="${original}" aria-label="Открыть визуализацию: ${sceneCaptions[scene]}"><img src="${original}" srcset="${compact} 480w, ${original} ${scene === 'metal' ? 1448 : 1122}w"
          sizes="(max-width: 44rem) 90vw, 350px" width="${scene === 'metal' ? 1448 : 1122}" height="${scene === 'metal' ? 1086 : 1402}"
          loading="lazy" decoding="async" alt="${sceneCaptions[scene]}"></a><figcaption>${sceneCaptions[scene]}</figcaption></figure>`
      }).join('')}
      <p>Интерьерные визуализации коллекции. Образец артикула показан отдельно.</p>
    </aside>` : ''}
    <div class="seo-product-purchase">
      <div>
      <h1>${escape(product.name)}</h1>
      ${product.sku && product.sku !== product.name ? `<p class="seo-card-meta">Артикул ${escape(product.sku)}</p>` : ''}
      <p>${escape(productDescription(product))}</p>
      <p>${escape(productEditorialNote(product))}</p>
      <p class="seo-price">${htmlPrice(product)} ${assessment(product)}</p>${stockLabel(product)}
      <div class="seo-tool-actions" data-storefront-tools="product" data-product-id="${escape(product.id)}" data-asset-base="${prefix}">
        ${anchor(telegram, 'Связаться с менеджером в Telegram', prefix)}
        <noscript><p>Для сохранения подборки в браузере включите JavaScript.</p></noscript>
      </div>
      ${sheetPricePerSquareMeter(product) === null ? '' : `<div class="seo-actions">${anchor(calculator, 'Рассчитать для моей стены', prefix)}</div>`}
      <div class="seo-actions">${anchor(samples, 'Запросить образец', prefix)}</div>
      </div>
      <dl>${productDetails(product).map(([name, value]) =>
        `<div><dt>${escape(name)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>
    </div>
  </div>${similar.length ? `<section><h2>Похожие материалы</h2>${listing(similar, prefix, images, false, ui)}</section>` : ''}
  ${complements.length ? `<section><h2>Сопутствующие материалы</h2><p>Сравните доступные варианты. Совместимость с выбранным изделием уточнит менеджер.</p>${listing(complements, prefix, images, false, ui)}</section>` : ''}`
}

const catalogControls = (prefix, categoryId = 'all') => `<div data-catalog-filters data-category-id="${escape(categoryId)}" data-asset-base="${escape(prefix)}"></div>`

function copyBlocks(blocks) {
  return blocks.map(({ heading, text }) => `<section><h2>${escape(heading)}</h2><p>${escape(text)}</p></section>`).join('')
}

function venueContacts(prefix) {
  const consultation = buildTelegramDraftUrl(CONTACTS.telegram, 'Здравствуйте! Нужна консультация по материалам ДЕКОРАЙ.')
  const sample = buildTelegramDraftUrl(CONTACTS.telegram, 'Здравствуйте! Хочу запросить образцы. Материалы или артикулы: ')
  return `<section class="seo-contact-section">
    <h2>Шоурум и связь с менеджером</h2>
    <div class="seo-contact-grid">
      <div><h3>Посетить шоурум</h3><address>${escape(CONTACTS.address)}</address><p>${escape(CONTACTS.hours)}</p>
        <div class="seo-actions">${anchor(CONTACTS.mapOrganization, 'Построить маршрут в Яндекс Картах', prefix)}
        <button type="button" hidden data-copy-address="${escape(CONTACTS.address)}">Скопировать адрес</button></div>
        <span data-copy-address-status role="status"></span>
      </div>
      <div><h3>Связаться с ДЕКОРАЙ</h3><div class="seo-actions">${contactLinks}
        ${anchor(consultation, 'Написать менеджеру в Telegram', prefix)}
        ${anchor(CONTACTS.telegramChannel, 'Канал в Telegram', prefix)}
        ${anchor(CONTACTS.avito, 'Магазин на Авито', prefix)}</div>
      </div>
      <div><h3>Подготовиться к покупке</h3><div class="seo-actions">
        ${anchor(sample, 'Запросить образец', prefix)}${anchor('/kalkulyator/', 'Получить расчёт', prefix)}</div>
      </div>
    </div>
  </section>`
}

function catalogNavigation(page, prefix) {
  const tabs = [['/catalog/', 'Все материалы'], ...collections.map(item => [categoryPath(item.id), item.name])]
  return '<nav class="filters-arch catalog-route-tabs" aria-label="Категории материалов">' + tabs.map(([path, name]) =>
    '<a href="' + escape(linkPath(path, prefix)) + '"' + (path === page.path ? ' aria-current="page"' : '') + '>' + escape(name) + '</a>').join('') + '</nav>'
}

function body(page, prefix, images, ui) {
  if (page.kind === 'home') return home(page, prefix, images)
  let contents
  switch (page.kind) {
    case 'catalog':
      contents = `<p>${escape(page.description)} ${products.length} позиций и ${collections.length} категорий.</p>
        ${catalogNavigation(page, prefix)}
        <div class="seo-actions">${seoPages.filter(item => item.kind === 'selection').map(item => anchor(item.path, item.heading, prefix)).join('')}</div>
        <section><h2>Все материалы</h2>${catalogControls(prefix)}${listing(products, prefix, images, true, ui)}</section>`
      break
    case 'category':
      contents = `<p>${escape(page.intro)}</p>${catalogNavigation(page, prefix)}
        <section><h2>Материалы и цены</h2>${catalogControls(prefix, page.categoryId)}${listing(products.filter(product => product.categoryId === page.categoryId), prefix, images, true, ui)}</section>
        <div class="seo-actions">${anchor('/obraztsy/', 'Как запросить образцы', prefix)}${anchor('/kalkulyator/', 'Рассчитать расход', prefix)}</div>`
      break
    case 'selection':
      contents = `<p>${escape(page.description)}</p><section><h2>Подтверждённые позиции</h2>${listing(page.items, prefix, images, false, ui)}</section>
        ${copyBlocks(page.copy.blocks)}<div class="seo-actions">${page.copy.links?.map(({path, label}) => anchor(path, label, prefix)).join('') ?? ''}</div>`
      break
    case 'product':
      return breadcrumbs(page, prefix) + productBody(page.product, prefix, images, ui)
    case 'articles':
      contents = seoPages.filter(item => item.kind === 'article').map(item =>
        `<section><h2>${anchor(item.path, item.heading, prefix)}</h2><p>${escape(item.description)}</p></section>`).join('')
      break
    default: {
      const action = commercialActions[page.path]
      const map = page.path === '/showroom/' || page.path === '/kontakty/'
      contents = `<div class="seo-copy${action ? ' seo-commercial' : ''}"><header class="seo-copy-intro"><p>${escape(page.description)}</p>
        ${action ? `<a class="btn btn-outline seo-main-action" href="${escape(linkPath(action[0], prefix))}">${escape(action[1])}</a>` : ''}</header>
        ${page.copy.image ? `<figure>
          <img src="${escape(prefix + page.copy.image)}" alt="${escape(page.copy.imageCaption ?? page.heading)}" decoding="async"${imageDimensions(page.copy.image, images)}${page.copy.imageSmall
            ? ` srcset="${escape(prefix + page.copy.imageSmall)} 720w, ${escape(prefix + page.copy.image)} 1440w" sizes="(max-width: 768px) 100vw, 48rem"`
            : ''}>
          ${page.copy.imageCaption ? `<figcaption>${escape(page.copy.imageCaption)}</figcaption>` : ''}
        </figure>` : ''}
        ${map ? venueContacts(prefix) : ''}
        ${map ? '<iframe class="seo-venue-map" title="Шоурум ДЕКОРАЙ на Яндекс Картах" src="' + escape(CONTACTS.mapWidget) + '" width="880" height="420" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>' : ''}
        <div class="seo-copy-blocks">${copyBlocks(page.copy.blocks)}</div>
        ${page.kind === 'article' && page.path !== '/stati/kak-sravnit-stoimost-otdelki/' ? `<div class="seo-actions">${anchor('/stati/kak-sravnit-stoimost-otdelki/', 'Сравнить стоимость материалов', prefix)}</div>` : ''}
        <div class="seo-actions">${(page.copy.links ?? []).filter(({ path }) => path !== action?.[0] &&
          !(action && path === '/#lead') && !(map && path === '/#showroom')).map(({ path, label }) => anchor(path, label, prefix)).join('')}
        ${page.kind === 'info' && page.path !== '/kontakty/' ? contactLinks : ''}</div></div>`
    }
  }
  if (page.path === '/otzyvy/') {
    contents += `<div data-seo-reviews data-asset-base="${escape(prefix)}"></div><section class="seo-map-reviews"><h2>Отзывы на Яндекс Картах</h2>
      <iframe title="Отзывы об организации на Яндекс Картах" src="https://yandex.ru/maps-reviews-widget/${escape(CONTACTS.mapOrganizationId)}?comments"
        width="560" height="520" loading="lazy"></iframe>
      <p><a href="${escape(CONTACTS.mapOrganization)}">Открыть карточку организации на Яндекс Картах</a></p></section>`
  }
  if (page.path === '/kalkulyator/') {
    contents = `<div data-storefront-tools="calculator" data-asset-base="${prefix}"><noscript>
      <p>Для интерактивного расчёта включите JavaScript. Инструкция по расчёту приведена ниже.</p>
    </noscript></div>` + contents
  }
  return breadcrumbs(page, prefix) + `<h1>${escape(page.heading)}</h1>` + contents
}

const graphId = hash => canonicalUrl('/' + hash)
const schemaAddress = { '@type': 'PostalAddress', addressCountry: 'RU', addressLocality: CONTACTS.city, streetAddress: CONTACTS.streetAddress }
const localBusiness = {
  '@type': 'LocalBusiness', '@id': graphId('#showroom'), name: CONTACTS.brand, url: canonicalUrl('/'),
  telephone: CONTACTS.phone, address: schemaAddress, openingHours: CONTACTS.openingHours,
  image: canonicalUrl('/' + ogCover), hasMap: CONTACTS.mapOrganization, parentOrganization: { '@id': graphId('#organization') },
}

const socialImage = page => page.kind === 'product' ? page.product.image
  : page.kind === 'selection' ? page.items[0].image
  : page.kind === 'category' ? categoryImage(page.categoryId)
  : (page.kind === 'article' || page.kind === 'info') && page.copy.image ? page.copy.image : ogCover

function schema(page) {
  const url = canonicalUrl(page.path)
  const graph = [{
    '@type': 'Organization', '@id': graphId('#organization'), name: CONTACTS.brand,
    url: canonicalUrl('/'), telephone: CONTACTS.phone, address: schemaAddress,
  }, localBusiness]
  if (page.kind === 'home') {
    graph.push({ '@type': 'WebSite', url, name: CONTACTS.brand }, {
      '@type': 'FAQPage', mainEntity: curatedFaq().map(({ q, a }) => ({
        '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    })
  } else {
    graph.push({ '@type': 'BreadcrumbList', itemListElement: crumbs(page).map(([path, name], index) => ({
      '@type': 'ListItem', position: index + 1, name, item: canonicalUrl(path),
    })) })
  }
  if (page.kind === 'product') {
    const { product } = page
    graph.push({
      '@type': 'Product', name: product.name, url, image: canonicalUrl('/' + product.image),
      description: productDescription(product), ...(product.sku ? { sku: product.sku } : {}),
      offers: { '@type': 'Offer', url, priceCurrency: 'RUB', price: product.priceRub },
    })
  } else if (page.kind === 'article') {
    graph.push({ '@type': 'Article', url, headline: page.heading, description: page.description,
      image: canonicalUrl('/' + socialImage(page)), dateModified: page.lastmod,
      publisher: { '@id': graphId('#organization') } })
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replaceAll('<', '\\u003c')
}

function shellContent(path, prefix, content, ui) {
  return ui ? '<div data-site-shell data-path="' + escape(path) + '" data-asset-base="' + escape(prefix) + '">' +
    ui.renderShell({ path, base: prefix, content }) + '</div>' : '<main class="container seo-main">' + content + '</main>'
}

export const rootContent = (page, images, ui) => shellContent('/', './', body(page, './', images, ui), ui)
export const jsonLd = page => `<script type="application/ld+json">${schema(page)}</script>`

export function renderSeoPage(page, stylesheets, _stockEnabled = false, toolsEntry = null, { images, venueEntry, reviewsEntry, ui } = {}) {
  const prefix = seoAssetPrefix(page.path)
  const image = canonicalUrl('/' + socialImage(page))
  const interactive = page.path === '/otzyvy/' ? reviewsEntry :
    ['/kontakty/', '/showroom/'].includes(page.path) ? venueEntry : null
  const entries = [toolsEntry, interactive].filter(Boolean)
  const styles = new Set([].concat(stylesheets, ...entries.map(entry => entry.css ?? [])))
  return `<!doctype html>
<html lang="ru"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#070707">
<title>${escape(page.title)}</title>
<meta name="description" content="${escape(page.description)}">
<link rel="canonical" href="${escape(canonicalUrl(page.path))}">
<link rel="icon" href="${prefix}favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${prefix}fonts/fonts.css">
${[...styles].map(file => '<link rel="stylesheet" href="' + escape(prefix + file) + '">').join('')}
<link rel="stylesheet" href="${prefix}seo-pages.css">
<meta name="robots" content="index, follow">
<meta property="og:type" content="${page.kind === 'article' ? 'article' : 'website'}">
<meta property="og:locale" content="ru_RU"><meta property="og:site_name" content="${escape(CONTACTS.brand)}">
<meta property="og:title" content="${escape(page.title)}"><meta property="og:description" content="${escape(page.description)}">
<meta property="og:url" content="${escape(canonicalUrl(page.path))}"><meta property="og:image" content="${escape(image)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${escape(image)}">
${jsonLd(page)}
</head><body class="seo-static">${shellContent(page.path, prefix, body(page, prefix, images, ui), ui)}
${entries.map(entry => '<script type="module" src="' + escape(prefix + entry.file) + '"></script>').join('')}</body></html>
`
}

export function renderSitemap() {
  // Canonical content dates come from the route inventory, never runtime stock or the build clock.
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    seoPages.map(({ path, lastmod }) => '  <url><loc>' + escape(canonicalUrl(path)) + '</loc><lastmod>' + escape(lastmod) + '</lastmod></url>').join('\n') + '\n</urlset>\n'
}

export function renderYml(now = new Date()) {
  const xml = value => escape(value)
  const categories = collections.map((category, index) => `<category id="${index + 1}">${xml(category.name)}</category>`).join('')
  const offers = products.map(product => `<offer id="${createHash('sha256').update(product.id).digest('hex').slice(0, 20)}">
    <name>${xml(product.name)}</name><url>${xml(canonicalUrl(productPath(product)))}</url>
    <price>${product.priceRub}</price><currencyId>RUR</currencyId><categoryId>${collections.findIndex(category => category.id === product.categoryId) + 1}</categoryId>
    <picture>${xml(canonicalUrl('/' + product.image))}</picture><description>${xml(productDescription(product))}</description>
    ${product.sku ? `<vendorCode>${xml(product.sku)}</vendorCode>` : ''}
  </offer>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="${now.toISOString().slice(0, 16).replace('T', ' ')}"><shop>
<name>${xml(CONTACTS.brand)}</name><company>${xml(CONTACTS.brand)}</company><url>${xml(canonicalUrl('/'))}</url>
<currencies><currency id="RUR" rate="1"/></currencies><categories>${categories}</categories>
<!-- Catalog prices only. No availability claims or delivery terms. -->
<offers>${offers}</offers></shop></yml_catalog>
`
}

export function notFound(stylesheets, toolsEntry, ui) {
  const base = process.env.DEKORAY_404_BASE || '/'
  const content = '<h1>Страница не найдена</h1><p>Проверьте адрес или перейдите в каталог материалов.</p>' +
    '<a class="btn btn-outline" href="' + escape(base) + 'catalog/">Каталог</a>'
  const styles = new Set([].concat(stylesheets, toolsEntry.css ?? [], 'seo-pages.css', 'fonts/fonts.css'))
  return '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta name="robots" content="noindex, follow"><title>Страница не найдена — ДЕКОРАЙ</title>' +
    [...styles].map(file => '<link rel="stylesheet" href="' + escape(base + file) + '">').join('') + '</head><body class="seo-static">' +
    shellContent('/404/', base, content, ui) + '<script type="module" src="' + escape(base + toolsEntry.file) + '"></script></body></html>'
}
