import { CONTACTS } from '../data/products'
import { AnalyticsSettings } from '../components/AnalyticsConsent'

import { privacySections } from '../data/privacyCopy'

export function PrivacyPage() {
  return (
    <section className="section legal" id="privacy">
      <div className="container">
        <p className="eyebrow">Документы</p>
        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontFamily: 'var(--font-display)' }}>
          Политика<br/>конфиденциальности
        </h1>
        <p className="lead" style={{ margin: '1.5rem 0 3rem' }}>
          Этот документ описывает фактическую работу сайта {CONTACTS.site},
          локальные данные браузера и обращения к сторонним сервисам.
        </p>
        <div className="legal-list">
          {privacySections.map((s) => (
            <div className="legal-block" key={s.h}>
              <h2 style={{ fontSize: '1.4rem', marginBottom: '0.75rem' }}>{s.h}</h2>
              <p>{s.p}</p>
            </div>
          ))}
        </div>
        <p className="legal-note"><a href="https://yandex.ru/legal/confidential/">Политика конфиденциальности Яндекса</a>. Согласие на аналитику относится к статистике сайта. Для заявки с именем или телефоном действуют отдельные условия обработки данных.</p>
        <AnalyticsSettings />
        <p className="legal-note">
          Документ действует с момента публикации. Редакция: 2026 г.
        </p>
      </div>
    </section>
  )
}
