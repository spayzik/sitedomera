import { createHash } from 'node:crypto'
import { CONTACTS, collections, products, faq } from '../src/data/products.ts'
import { productDescription } from '../src/lib/productPresentation.ts'
import { canonicalUrl, categoryPath, productPath, seoPages } from '../src/data/seoRoutes.ts'

export const escape = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character])

const pageFor = path => seoPages.find(page => page.path === path)
const ogCover = 'catalog/og-cover.jpg'
const categoryImage = id => 'catalog/categories/carousel-2026-' + id + '.webp'
function crumbs(page) {
  if (page.kind === 'category' || page.kind === 'selection') return [['/', CONTACTS.brand], ['/catalog/', 'Каталог'], [page.path, page.heading]]
  if (page.kind === 'product') {
    const category = categoryPath(page.product.categoryId)
    return [['/', CONTACTS.brand], ['/catalog/', 'Каталог'], [category, pageFor(category).heading], [page.path, page.heading]]
  }
  if (page.kind === 'article') return [['/', CONTACTS.brand], ['/stati/', 'Статьи'], [page.path, page.heading]]
  return [['/', CONTACTS.brand], [page.path, page.heading]]
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
      '@type': 'FAQPage', mainEntity: faq.map(({ q, a }) => ({
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

export const jsonLd = page => '<script type="application/ld+json">' + schema(page) + '</script>'

export function renderRoot(path, base, ui) {
  return '<div id="root" data-path="' + escape(path) + '" data-asset-base="' + escape(base) + '">' +
    ui.renderShell({ path, base }) + '</div>'
}

export function renderSeoPage(page, base, assets, ui) {
  const styles = assets.css.map(file => '<link rel="stylesheet" href="' + escape(base + file) + '">').join('')
  const css = '<link rel="stylesheet" href="' + escape(base) + 'fonts/fonts.css">' + styles
  const script = '<script type="module" src="' + escape(base + assets.file) + '"></script>'
  if (!page) return '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta name="robots" content="noindex, follow"><title>Страница не найдена — ДЕКОРАЙ</title>' + css +
    '</head><body>' + renderRoot('/404/', base, ui) + script + '</body></html>'
  return '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta name="theme-color" content="#070707"><meta name="robots" content="index, follow"><title>' + escape(page.title) + '</title>' +
    '<meta name="description" content="' + escape(page.description) + '"><link rel="canonical" href="' + escape(canonicalUrl(page.path)) + '">' +
    '<link rel="icon" href="' + escape(base) + 'favicon.svg" type="image/svg+xml">' + css +
    '<meta property="og:type" content="' + (page.kind === 'article' ? 'article' : 'website') + '">' +
    '<meta property="og:locale" content="ru_RU"><meta property="og:site_name" content="' + escape(CONTACTS.brand) + '">' +
    '<meta property="og:title" content="' + escape(page.title) + '"><meta property="og:description" content="' + escape(page.description) + '">' +
    '<meta property="og:url" content="' + escape(canonicalUrl(page.path)) + '"><meta property="og:image" content="' + escape(canonicalUrl('/' + socialImage(page))) + '">' +
    '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="' + escape(canonicalUrl('/' + socialImage(page))) + '">' +
    jsonLd(page) + '</head><body>' + renderRoot(page.path, base, ui) + script + '</body></html>'
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
