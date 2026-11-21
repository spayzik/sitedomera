import { useEffect, useMemo, useState } from 'react'
import { MotionConfig } from 'framer-motion'
import { Header } from './Header'
import { Footer } from './Footer'
import { Calculator } from './Calculator'
import { FloatingCart } from './FloatingCart'
import { AnalyticsBanner, PrivacyProvider } from './AnalyticsConsent'
import { LeadProvider } from './LeadProvider'
import { InventoryProvider } from '../context/InventoryContext'
import { CartProvider } from '../context/CartContext'

export function SiteFrame({ base = './', path = '/', children }: {
  base?: string; path?: string; children: React.ReactNode
}) {
  return <><Header base={base} path={path} />{children}<Footer base={base} /></>
}

export function SiteLayout({ base, path, content, enhancements }: {
  base: string
  path: string
  content: string
  enhancements?: React.ReactNode
}) {
  const staticMarkup = useMemo(() => ({ __html: content }), [content])
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  return <MotionConfig reducedMotion="user">
    <PrivacyProvider>
      <InventoryProvider snapshotUrl={base + 'generated/inventory.json'}>
        <LeadProvider>
          <CartProvider>
            <SiteFrame base={base} path={path}><main className="container seo-main">
              <div data-static-content="" dangerouslySetInnerHTML={staticMarkup} />
              {path === '/kalkulyator/' && <Calculator standalone />}
            </main></SiteFrame>
            {ready && <><FloatingCart /><AnalyticsBanner privacyHref={base + 'privacy/'} />{enhancements}</>}
          </CartProvider>
        </LeadProvider>
      </InventoryProvider>
    </PrivacyProvider>
  </MotionConfig>
}
