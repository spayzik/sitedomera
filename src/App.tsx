import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { CartProvider } from './context/CartContext'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { Specs } from './components/Specs'
import { Catalog } from './components/Catalog'
import { CategoriesTeaser } from './components/CategoriesTeaser'
import { Manifest } from './components/Manifest'
import { WhyUs } from './components/WhyUs'
import { Cursor } from './components/Cursor'
import { ScrollGlow } from './components/ScrollGlow'
import { CatalogPage } from './pages/CatalogPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { OfferPage } from './pages/OfferPage'
import { Preloader } from './components/Preloader'
import { ScrollProgress } from './components/ScrollProgress'
import { BackToTop } from './components/BackToTop'
import { GradientLine } from './components/GradientLine'
import { LogoIcon } from './components/Logo'
import { useRoute, isPageRoute } from './router'
import { CONTACTS } from './data/products'

const Quiz = lazy(() => import('./components/Quiz').then(m => ({ default: m.Quiz })))
const Installation = lazy(() => import('./components/Installation').then(m => ({ default: m.Installation })))
const Interiors = lazy(() => import('./components/Interiors').then(m => ({ default: m.Interiors })))
const Reviews = lazy(() => import('./components/Reviews').then(m => ({ default: m.Reviews })))
const Showroom = lazy(() => import('./components/Showroom').then(m => ({ default: m.Showroom })))
const Compare = lazy(() => import('./components/Compare').then(m => ({ default: m.Compare })))
const Calculator = lazy(() => import('./components/Calculator').then(m => ({ default: m.Calculator })))
const FAQ = lazy(() => import('./components/FAQ').then(m => ({ default: m.FAQ })))

const CartDrawer = lazy(() => import('./components/CartDrawer').then(m => ({ default: m.CartDrawer })))
const FloatingCart = lazy(() => import('./components/FloatingCart').then(m => ({ default: m.FloatingCart })))
const ChatBot = lazy(() => import('./components/ChatBot').then(m => ({ default: m.ChatBot })))
const TelegramFab = lazy(() => import('./components/TelegramFab').then(m => ({ default: m.TelegramFab })))

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-col">
            <span className="footer-logo">
              <LogoIcon size={42} />
            </span>
            <p className="footer-desc">
              Архитектурные стеновые панели из бамбукового композита.
              <br/>Премиальные фактуры для современных интерьеров.
            </p>
          </div>
          <div className="footer-navs">
            <div className="footer-nav-col">
              <strong>Навигация</strong>
              <a href="#/catalog">Каталог 2026</a>
              <a href="#specs">Технологии</a>
              <a href="#interiors">Интерьеры</a>
              <a href="#installation">Монтаж под ключ</a>
            </div>
            <div className="footer-nav-col">
              <strong>Шоурум</strong>
              <span>Москва, Алтуфьевское ш., 37с1</span>
              <span>Ежедневно 11:00–20:00, без записи</span>
              <a href={`tel:${CONTACTS.phoneRaw}`} className="footer-phone">{CONTACTS.phone}</a>
            </div>
          </div>
        </div>
        
        {/* Massive Typography Brand Reveal */}
        <div className="footer-ghost" aria-hidden="true">ДОМЭРА</div>
        <div className="footer-massive">
          ДОМЭРА
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} {CONTACTS.brand}. Все права защищены.</p>
          <div className="footer-legal">
            <a href="#/privacy">Политика конфиденциальности</a>
            <a href="#/offer">Договор оферты</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

function Home({ route }: { route: string }) {
  useEffect(() => {
    const id = route.replace('/', '')
    if (id && !isPageRoute(route)) {
      const el = document.getElementById(id)
      if (el) {
        requestAnimationFrame(() => {
          el.scrollIntoView({ behavior: 'smooth' })
        })
      }
    }
  }, [route])

  return (
    <>
      <Hero />
      <GradientLine />
      <Manifest />
      <Specs />
      <WhyUs />
      <CategoriesTeaser />
      <Catalog />
      <GradientLine />
      <Suspense fallback={null}>
        <Quiz />
        <Installation />
        <Interiors />
        <Reviews />
        <Compare />
        <Calculator />
      </Suspense>
      <GradientLine />
      <Suspense fallback={null}>
        <Showroom />
        <FAQ />
      </Suspense>
    </>
  )
}

function Wrapper({ children }: { children: ReactNode }) {
  const route = useRoute()
  const [booted, setBooted] = useState(false)
  const [widgetsReady, setWidgetsReady] = useState(false)

  useEffect(() => {
    let idle = 0
    const t = window.setTimeout(() => {
      setBooted(true)
      // Тяжёлые виджеты — после первого простоя, чтобы не мешать стартовой отрисовке
      idle = window.setTimeout(() => setWidgetsReady(true), 400)
    }, 1200)
    return () => { window.clearTimeout(t); if (idle) window.clearTimeout(idle) }
  }, [])

  useEffect(() => {
    if (isPageRoute(route)) {
      window.scrollTo({ top: 0 })
    }
  }, [route])

  return (
    <CartProvider>
      <Preloader done={booted} />
      <Cursor />
      <ScrollProgress />
      <ScrollGlow />

      <Header />
      <main>{children}</main>
      <Footer />
      {widgetsReady && (
        <Suspense fallback={null}>
          <CartDrawer />
          <FloatingCart />
          <ChatBot />
          <TelegramFab />
        </Suspense>
      )}
      <BackToTop />
    </CartProvider>
  )
}

export default function App() {
  const route = useRoute()

  const page = isPageRoute(route)
    ? route === '/catalog'
      ? <CatalogPage />
      : route === '/privacy'
        ? <PrivacyPage />
        : <OfferPage />
    : <Home route={route} />

  return (
    <Wrapper>
      {page}
    </Wrapper>
  )
}