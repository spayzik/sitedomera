import { lazy, Suspense, useContext, useEffect, useLayoutEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createPortal } from 'react-dom'
import { MotionConfig } from 'framer-motion'
import { AnalyticsBanner, CookieSettingsLink, PrivacyProvider } from './components/AnalyticsConsent'
import { LeadAction, LeadProvider } from './components/LeadProvider'
import { CartProvider, useCart } from './context/CartContext'
import { InventoryProvider } from './context/InventoryContext'
import { InventoryContext } from './context/inventoryState'
import { formatDimensions, products, collections, type CollectionId, type Product } from './data/products'
import { availabilityFor, stockLabel } from './lib/inventory'
import { sheetArea } from './lib/calculator'
import { ProductEstimate } from './components/ProductEstimate'
import { StaticCatalogControls } from './components/StaticCatalogControls'

const Calculator = lazy(() => import('./components/Calculator').then(module => ({ default: module.Calculator })))
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
  const { add, count, open, setOpen } = useCart()
  const [drawerActivated, setDrawerActivated] = useState(false)
  useEffect(() => { if (open) setDrawerActivated(true) }, [open])
  const context = product && [
    product.name, product.sku && product.sku !== product.name ? 'Артикул: ' + product.sku : '',
    formatDimensions(product),
  ].filter(Boolean).join(' · ')

  return <>
    {(product || catalog) && <StorefrontAvailability product={product} />}
    {product ? <>
      <button type="button" className="btn btn-primary" onClick={() => add(product)}>Добавить в подборку</button>
      <LeadAction className="btn btn-outline" intent="consultation" context={context}>Связаться с менеджером</LeadAction>
      {sheetArea(product) > 0 && <ProductEstimate product={product} calculatorBase={assetBase} />}
    </> : catalog ? <StaticCatalogControls category={category} /> : <Suspense fallback={null}><Calculator /></Suspense>}
    {count > 0 && <button type="button" className="btn btn-outline"
      onClick={() => setOpen(true)}>Моя подборка · {count}</button>}
    {(open || drawerActivated) && <Suspense fallback={null}><CartDrawer assetBase={assetBase} /></Suspense>}
  </>
}

const root = document.querySelector<HTMLElement>('[data-storefront-tools], [data-catalog-filters]')
if (root) {
  const assetBase = new URL(root.dataset.assetBase ?? './', document.baseURI).href
  const product = products.find(p => p.id === root.dataset.productId)
  const cookieSettings = document.querySelector('[data-cookie-settings]')
  const catalog = root.hasAttribute('data-catalog-filters')
  const category = collections.find(item => item.id === root.dataset.categoryId)?.id
  if (product || catalog || root.dataset.storefrontTools === 'calculator') {
    createRoot(root).render(
      <MotionConfig reducedMotion="user">
        <PrivacyProvider>
          <InventoryProvider snapshotUrl={assetBase + 'generated/inventory.json'}>
            <LeadProvider>
              <CartProvider><StorefrontTools product={product} assetBase={assetBase} catalog={catalog} category={category} /></CartProvider>
              <AnalyticsBanner privacyHref={assetBase + 'privacy/'} />
              {cookieSettings && createPortal(<CookieSettingsLink />, cookieSettings)}
            </LeadProvider>
          </InventoryProvider>
        </PrivacyProvider>
      </MotionConfig>,
    )
  }
}
