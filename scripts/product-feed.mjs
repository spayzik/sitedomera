import { CONTACTS, collections, products } from '../src/data/products.ts'
import { canonicalUrl, productPath } from '../src/data/seoRoutes.ts'
import { storefrontImageSize } from '../src/data/storefrontImageSizes.ts'
import { feedOfferId } from '../src/data/feedOfferIds.ts'
import { productDescription } from '../src/lib/productPresentation.ts'

const escape = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
})[character])
const categoryIds = new Map(collections.map(({ id }, index) => [id, index + 1]))
const directDate = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
})

function qualifiesForSearch(product) {
  const { width, height } = storefrontImageSize(product.image)
  return width >= 300 && height >= 400
}

export function renderYml(now = new Date(), { channel = 'direct', saleable = new Set(), commerce } = {}) {
  const search = channel === 'search'
  const date = search ? now.toISOString().replace(/\.\d{3}Z$/, 'Z') : directDate.format(now)
  const ready = Boolean(commerce?.legalName && (commerce.delivery || commerce.pickup))
  const available = product => ready && saleable.has(product.id)
  const categories = collections.map(({ id, name }) => `<category id="${categoryIds.get(id)}">${escape(name)}</category>`).join('')
  const offeredProducts = search ? products.filter(product => available(product) && qualifiesForSearch(product)) : products
  const offers = offeredProducts.map(product => {
    const id = feedOfferId(product.id)
    if (!id) throw new Error('Missing public offer ID for a catalog product')
    return `<offer id="${id}" available="${available(product)}">
    <name>${escape(product.name)}</name><url>${escape(canonicalUrl(productPath(product)))}</url>
    <price>${product.priceRub}</price><currencyId>RUR</currencyId><categoryId>${categoryIds.get(product.categoryId)}</categoryId>
    <picture>${escape(canonicalUrl('/' + product.image))}</picture><description>${escape(productDescription(product))}</description>
    ${product.sku ? `<vendorCode>${escape(product.sku)}</vendorCode>` : ''}
  </offer>`
  }).join('\n')
  const company = ready ? `<company>${escape(commerce.legalName)}</company>` : ''
  const fulfillment = ready ? `<delivery>${commerce.delivery}</delivery><pickup>${commerce.pickup}</pickup>` : ''
  return `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="${date}"><shop>
<name>${escape(CONTACTS.brand)}</name>${company}<url>${escape(canonicalUrl('/'))}</url>
<currencies><currency id="RUR" rate="1"/></currencies><categories>${categories}</categories>${fulfillment}
<offers>${offers}</offers></shop></yml_catalog>
`
}
