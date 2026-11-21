import { lazy, Suspense, useContext, useEffect, useLayoutEffect, useState } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { createPortal } from 'react-dom'
import { SiteLayout } from './components/SiteLayout'
import { LeadAction } from './components/LeadProvider'
import { useCart } from './context/CartContext'
import { InventoryContext } from './context/inventoryState'
import { formatDimensions, products, collections, type CollectionId, type Product } from './data/products'
import { availabilityFor, stockLabel } from './lib/inventory'
import { sheetArea } from './lib/calculator'
import { ProductEstimate } from './components/ProductEstimate'
import { StaticCatalogControls } from './components/StaticCatalogControls'

const CartDrawer = lazy(() => import('./components/CartDrawer').then(module => ({ default: module.CartDrawer })))

function StorefrontAvailability({ product }: { product?: Product }) {
  const state = useContext(InventoryContext)

  useLayoutEffect(() => {
    const now = Date.now()
    for (const label of document.querySelectorAll<HTMLElement>('.seo-stock[data-stock-id]')) {
      const stock = availabilityFor(state.inventory, label.dataset.stockId ?? '', now, state.unavailable)
      label.dataset.stock = stock.status
      label.textContent = stockLabel(stock)
    }

    if (!product) return
    const json = document.querySelector<HTMLScriptElement>('script[type="application/ld+json"]')
    if (!json?.textContent) return
    const schema = JSON.parse(json.textContent)
    const offer = schema['@graph'].find((node: { '@type': string }) => node['@type'] === 'Product')?.offers
    if (!offer) return
    const stock = availabilityFor(state.inventory, product.id, now, state.unavailable)
    if (stock.status === 'unknown') delete offer.availability
    else offer.availability = stock.status === 'in_stock' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
    json.textContent = JSON.stringify(schema)
  }, [product, state])

  return null
}

export function StorefrontTools({ product, assetBase, catalog, category }: { product?: Product; assetBase: string; catalog?: boolean; category?: CollectionId }) {
  const { add, open } = useCart()
  const [drawerActivated, setDrawerActivated] = useState(false)
  useEffect(() => { if (open) setDrawerActivated(true) }, [open])
  const context = product && [
    product.name, product.sku && product.sku !== product.name ? 'Артикул: ' + product.sku : '',
    formatDimensions(product),
  ].filter(Boolean).join(' · ')

  return <>
    <StorefrontAvailability product={product} />
    {product ? <>
      <button type="button" className="btn btn-primary" onClick={() => add(product)}>Добавить в подборку</button>
      <LeadAction className="btn btn-outline" intent="consultation" context={context}>Связаться с менеджером</LeadAction>
      {sheetArea(product) > 0 && <ProductEstimate product={product} calculatorBase={assetBase} />}
    </> : catalog ? <StaticCatalogControls category={category} /> : null}
    {(open || drawerActivated) && <Suspense fallback={null}><CartDrawer assetBase={assetBase} /></Suspense>}
  </>
}

const shell = document.querySelector<HTMLElement>('[data-site-shell]')
if (shell) {
  const base = shell.dataset.assetBase ?? './'
  const path = shell.dataset.path ?? '/'
  const target = shell.querySelector<HTMLElement>('[data-storefront-tools], [data-catalog-filters]')
  const product = products.find(p => p.id === target?.dataset.productId)
  const catalog = target?.hasAttribute('data-catalog-filters')
  const category = collections.find(item => item.id === target?.dataset.categoryId)?.id
  const content = shell.querySelector('[data-static-content]')?.innerHTML ?? ''
  const tools = <StorefrontTools product={product} assetBase={base} catalog={catalog} category={category} />
  hydrateRoot(shell, <SiteLayout base={base} path={path} content={content}
    enhancements={target ? createPortal(tools, target) : tools} />)
}
