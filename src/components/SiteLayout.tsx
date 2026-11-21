import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { MotionConfig } from 'framer-motion'
import { ScrollGlow } from './ScrollGlow'
import { Header } from './Header'
import { Footer } from './Footer'
import { FloatingCart } from './FloatingCart'
import { AnalyticsBanner, PrivacyProvider } from './AnalyticsConsent'
import { LeadProvider } from './LeadProvider'
import { InventoryProvider } from '../context/InventoryContext'
import { CartProvider, useCart } from '../context/CartContext'

const CartDrawer = lazy(() => import('./CartDrawer').then(module => ({ default: module.CartDrawer })))
const TelegramFab = lazy(() => import('./TelegramFab').then(module => ({ default: module.TelegramFab })))
const ChatBot = lazy(() => import('./ChatBot').then(module => ({ default: module.ChatBot })))

function StorefrontWidgets({ base, home }: { base: string; home: boolean }) {
  const { open } = useCart()
  return <>
    <FloatingCart />
    <AnalyticsBanner privacyHref={base + 'privacy/'} />
    <Suspense fallback={null}>{open && <CartDrawer assetBase={base} />}</Suspense>
    <Suspense fallback={null}><TelegramFab />{home && <ChatBot />}</Suspense>
  </>
}

export function SiteLayout({ base, path, children }: { base: string; path: string; children: ReactNode }) {
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  return <MotionConfig reducedMotion="user">
    <PrivacyProvider>
      <InventoryProvider snapshotUrl={base + 'generated/inventory.json'}>
        <LeadProvider>
          <CartProvider>
            <ScrollGlow />
            <Header base={base} path={path} />
            <main id="page-content">{children}</main>
            <Footer base={base} />
            {ready && <StorefrontWidgets base={base} home={path === '/'} />}
          </CartProvider>
        </LeadProvider>
      </InventoryProvider>
    </PrivacyProvider>
  </MotionConfig>
}
