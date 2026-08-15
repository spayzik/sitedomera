import { useEffect, useState, type ReactNode } from 'react'
import { CartProvider } from './context/CartContext'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { Specs } from './components/Specs'
import { Catalog } from './components/Catalog'
import { Installation } from './components/Installation'
import { Calculator } from './components/Calculator'
import { Quiz } from './components/Quiz'
import { Reviews } from './components/Reviews'
import { Showroom } from './components/Showroom'
import { CartDrawer } from './components/CartDrawer'
import { FloatingCart } from './components/FloatingCart'
import { ChatBot } from './components/ChatBot'
import { CategoriesTeaser } from './components/CategoriesTeaser'
import { Manifest } from './components/Manifest'
import { WhyUs } from './components/WhyUs'
import { Compare } from './components/Compare'
import { Interiors } from './components/Interiors'
import { FAQ } from './components/FAQ'
import { Cursor } from './components/Cursor'
import { ScrollGlow } from './components/ScrollGlow'
import { CatalogPage } from './pages/CatalogPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { OfferPage } from './pages/OfferPage'
import { Preloader } from './components/Preloader'
import { ScrollProgress } from './components/ScrollProgress'
import { BackToTop } from './components/BackToTop'
import { GradientLine } from './components/GradientLine'
import { TelegramFab } from './components/TelegramFab'
import { LogoIcon } from './components/Logo'
import { useRoute, isPageRoute } from './router'
import { CONTACTS } from './data/products'

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
      <Quiz />
      <Installation />
      <Interiors />
      <Reviews />
      <Compare />
      <Calculator />
      <GradientLine />
<Showroom />
      <FAQ />
    </>
  )
}

function Wrapper({ children }: { children: ReactNode }) {
  const route = useRoute()
  const [booted, setBooted] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setBooted(true), 1600)
    return () => window.clearTimeout(t)
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
      <CartDrawer />
      <FloatingCart />
      <ChatBot />
      <TelegramFab />
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