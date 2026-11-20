import { createHash } from 'node:crypto'
import { CONTACTS, collections, faq, formatDimensions, productDetails, products } from '../src/data/products.ts'
import { productDescription } from '../src/lib/productPresentation.ts'
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
const linkPath = (path, prefix) => path.startsWith('https://') ? path : path === '/' ? prefix : prefix + path.slice(1)
const anchor = (path, label, prefix) => `<a href="${escape(linkPath(path, prefix))}">${escape(label)}</a>`
const picture = (path, alt, prefix, lazy = true) =>
  `<img src="${escape(prefix + path)}" alt="${escape(alt)}"${lazy ? ' loading="lazy"' : ''} decoding="async">`

const contactLinks = `<a href="tel:${escape(CONTACTS.phoneRaw)}">${escape(CONTACTS.phone)}</a>`
const mainNav = [
  ['/catalog/', 'Каталог'], ['/montazh/', 'Монтаж'], ['/kalkulyator/', 'Калькулятор'],
  ['/showroom/', 'Шоурум'], ['/kontakty/', 'Контакты'],
]

const header = prefix => `<header class="seo-header"><div class="container">
  ${anchor('/', CONTACTS.brand, prefix)}
  <nav aria-label="Основное меню">${mainNav.map(([path, label]) => anchor(path, label, prefix)).join('')}</nav>
</div></header>`
const footer = prefix => `<footer class="seo-footer"><div class="container">
  <strong>${escape(CONTACTS.brand)}</strong><p>${escape(CONTACTS.address)} · ${escape(CONTACTS.hours)}</p>
  <div class="seo-actions">${contactLinks}${anchor('/dostavka/', 'Доставка и оплата', prefix)}${anchor('/stati/', 'Статьи', prefix)}
  ${anchor('/#/privacy', 'Политика конфиденциальности', prefix)}</div>
</div></footer>`

function crumbs(page) {
  if (page.kind === 'category') return [['/', CONTACTS.brand], ['/catalog/', 'Каталог'], [page.path, page.heading]]
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

function listing(items, prefix) {
  return `<ul class="seo-cards">${items.map(product => `<li class="seo-product-card">
    <a href="${escape(linkPath(productPath(product), prefix))}">
      ${picture(product.image, '', prefix)}
      <strong>${escape(product.name)}</strong>
    </a>
    ${product.sku && product.name !== product.sku ? `<p>Артикул ${escape(product.sku)}</p>` : ''}
    <p>${escape(formatDimensions(product))}</p>
    <p class="seo-price">${htmlPrice(product)} ${assessment(product)}</p>${stockLabel(product)}
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

function home(page, prefix) {
  return `<div class="seo-home-hero">
    ${picture('catalog/hero/hero.webp', '', prefix, false)}
    <div><h1>${escape(page.heading)}</h1><p>${escape(page.description)}</p>
    <p>${products.length} позиций · ${collections.length} категорий</p>
    <div class="seo-actions">${anchor('/catalog/', 'Открыть каталог', prefix)}${anchor('/kalkulyator/', 'Рассчитать расход', prefix)}</div></div>
  </div>
  <section><h2>Фактуры и материалы</h2>${categoryLinks(prefix)}</section>
  <section><h2>Перед покупкой</h2><div class="seo-actions">
    ${anchor('/montazh/', 'Подготовка к монтажу', prefix)}${anchor('/dostavka/', 'Доставка и оплата', prefix)}
    ${anchor('/showroom/', 'Посмотреть материалы вживую', prefix)}${anchor('/stati/', 'Практические статьи', prefix)}
  </div></section>
  <section><h2>Ответы на вопросы</h2>${curatedFaq().map(({ q, a }) =>
    `<details><summary>${escape(q)}</summary><p>${escape(a)}</p></details>`).join('')}</section>`
}

function productBody(product, prefix) {
  const similar = products.filter(item => item.categoryId === product.categoryId && item.id !== product.id).slice(0, 3)
  const calculator = '/kalkulyator/?material=' + encodeURIComponent(product.id)
  const category = collections.find(item => item.id === product.categoryId)
  const telegram = buildTelegramDraftUrl(CONTACTS.telegram, formatProductTelegramMessage(product, category.name))
  return `<div class="seo-product-detail">
    <div class="seo-sample">${picture(product.image, product.name, prefix, false)}</div>
    <div>
      <p>${escape(productDescription(product))}</p>
      <p class="seo-price">${htmlPrice(product)} ${assessment(product)}</p>${stockLabel(product)}
      <dl>${productDetails(product).map(([name, value]) =>
        `<div><dt>${escape(name)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>
      <div class="seo-actions">
        ${sheetPricePerSquareMeter(product) === null ? '' : anchor(calculator, 'Рассчитать для моей стены', prefix)}
        ${anchor(categoryPath(product.categoryId), 'Вся коллекция', prefix)}
      </div>
      <div class="seo-tool-actions" data-storefront-tools="product" data-product-id="${escape(product.id)}" data-asset-base="${prefix}">
        ${anchor(telegram, 'Связаться с менеджером в Telegram', prefix)}
        <noscript><p>Для сохранения подборки в браузере включите JavaScript.</p></noscript>
      </div>
    </div>
  </div>${similar.length ? `<section><h2>Другие материалы коллекции</h2>${listing(similar, prefix)}</section>` : ''}`
}

function body(page, prefix) {
  if (page.kind === 'home') return home(page, prefix)
  let contents
  switch (page.kind) {
    case 'catalog':
      contents = `<p>${escape(page.description)} ${products.length} позиций и ${collections.length} категорий.</p>
        <div class="seo-actions">${anchor('/#/catalog', 'Поиск, фильтры и подборка', prefix)}</div>
        ${categoryLinks(prefix)}<section><h2>Все материалы</h2>${listing(products, prefix)}</section>`
      break
    case 'category':
      contents = `<p>${escape(page.intro)}</p><div class="seo-actions">${anchor('/#/catalog?category=' + page.categoryId, 'Открыть коллекцию в интерактивном каталоге', prefix)}</div>
        <section><h2>Материалы и цены</h2>${listing(products.filter(product => product.categoryId === page.categoryId), prefix)}</section>`
      break
    case 'product':
      contents = productBody(page.product, prefix)
      break
    case 'articles':
      contents = seoPages.filter(item => item.kind === 'article').map(item =>
        `<section><h2>${anchor(item.path, item.heading, prefix)}</h2><p>${escape(item.description)}</p></section>`).join('')
      break
    default:
      contents = `<div class="seo-copy"><p>${escape(page.description)}</p>
        ${page.copy.image ? `<figure>
          <img src="${escape(prefix + page.copy.image)}" alt="${escape(page.heading)}" decoding="async"${page.copy.imageSmall
            ? ` srcset="${escape(prefix + page.copy.imageSmall)} 720w, ${escape(prefix + page.copy.image)} 1440w" sizes="(max-width: 768px) 100vw, 48rem"`
            : ''}>
          ${page.copy.imageCaption ? `<figcaption>${escape(page.copy.imageCaption)}</figcaption>` : ''}
        </figure>` : ''}
        ${page.copy.blocks.map(({ heading, text }) => `<section><h2>${escape(heading)}</h2><p>${escape(text)}</p></section>`).join('')}
        <div class="seo-actions">${(page.copy.links ?? []).map(({ path, label }) => anchor(path, label, prefix)).join('')}
        ${page.kind === 'info' ? contactLinks : ''}${page.path === '/showroom/' ? '<a href="https://yandex.ru/maps/-/CXWSyOoT">ДЕКОРАЙ на Яндекс Картах</a>' : ''}</div></div>`
  }
  if (page.path === '/otzyvy/') {
    contents += `<section class="seo-map-reviews"><h2>Отзывы на Яндекс Картах</h2>
      <iframe title="Отзывы об организации на Яндекс Картах" src="https://yandex.ru/maps-reviews-widget/55177309503?comments"
        width="560" height="520" loading="lazy"></iframe>
      <p><a href="https://yandex.ru/maps/-/CXWSyOoT">Открыть карточку организации на Яндекс Картах</a></p></section>`
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
  image: canonicalUrl('/' + ogCover), parentOrganization: { '@id': graphId('#organization') },
}

const socialImage = page => page.kind === 'product' ? page.product.image
  : page.kind === 'category' ? categoryImage(page.categoryId) : ogCover

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
      publisher: { '@id': graphId('#organization') } })
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replaceAll('<', '\\u003c')
}

export const rootContent = page => `<div class="seo-static">${header('./')}<main class="container seo-main">${body(page, './')}</main>${footer('./')}</div>`
export const jsonLd = page => `<script type="application/ld+json">${schema(page)}</script>`

export function renderSeoPage(page, stylesheets, stockEnabled = false, toolsEntry = null) {
  const prefix = seoAssetPrefix(page.path)
  const image = canonicalUrl('/' + socialImage(page))
  const interactive = page.kind === 'product' || page.path === '/kalkulyator/' ? toolsEntry : null
  const styles = new Set([].concat(stylesheets, interactive?.css ?? []))
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
</head><body class="seo-static">${header(prefix)}<main class="container seo-main">${body(page, prefix)}</main>${footer(prefix)}
${stockEnabled && ['catalog', 'category'].includes(page.kind) ? '<script id="stock-catalog" type="application/json" data-url="' + prefix + 'generated/inventory.json">' +
  JSON.stringify(products.map(({ id, unit }) => ({ id, unit }))) + '</script><script type="module" src="' + prefix + 'seo-stock.js"></script>' : ''}
${interactive ? '<script type="module" src="' + escape(prefix + interactive.file) + '"></script>' : ''}</body></html>
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

export const notFound = `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, follow">
<title>Страница не найдена — ${escape(CONTACTS.brand)}</title></head><body><main>
<h1>Страница не найдена</h1><p>Проверьте адрес или перейдите в каталог материалов.</p>
<p><a href="/">Главная</a> · <a href="/catalog/">Каталог</a></p>
</main></body></html>
`
