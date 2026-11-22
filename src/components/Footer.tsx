import { SocialContacts } from './SocialContacts'
import { CONTACTS } from '../data/products'
import { LogoIcon } from './Logo'
import { CookieSettingsLink } from './AnalyticsConsent'

export function Footer({ base = './' }: { base?: string }) {
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
              <a href={base + "catalog/"}>Каталог 2026</a>
              <a href={base + "#specs"}>Технологии</a>
              <a href={base + "#interiors"}>Интерьеры</a>
              <a href={base + "montazh/"}>Монтаж</a>
              <a href={base + "kalkulyator/"}>Калькулятор</a>
              <a href={base + "news/"}>Статьи</a>
            </div>
            <div className="footer-nav-col">
              <strong><a href={base + "showroom/"}>Шоурум</a></strong>
              <span>{CONTACTS.address}</span>
              <span>{CONTACTS.hours}</span>
              <a href={base + "dostavka/"}>Доставка и оплата</a>
              <a href={base + "kontakty/"}>Контакты</a>
              <SocialContacts base={base} placement="footer" />
            </div>
          </div>
        </div>

        {/* Massive Typography Brand Reveal */}
        <div className="footer-ghost" aria-hidden="true">ДЕКОРАЙ</div>
        <div className="footer-massive">
          ДЕКОРАЙ
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} {CONTACTS.brand}. Все права защищены.</p>
          <div className="footer-legal">
            <a href={base + 'privacy/'}>Политика конфиденциальности</a>
            <CookieSettingsLink />
            <a href={base + "#/offer"}>Условия приобретения</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
