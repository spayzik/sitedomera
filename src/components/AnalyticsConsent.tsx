import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { isAnalyticsConfigured, observeAnalyticsConsent, readAnalyticsConsent, saveAnalyticsConsent, startAnalytics, stopAnalytics, trackAnalyticsLink, trackAnalyticsPage, type AnalyticsConsent } from '../lib/analytics'

type ConsentContextValue = {
  consent: AnalyticsConsent
  choose: (value: 'accepted' | 'rejected') => void
}

const ConsentContext = createContext<ConsentContextValue | null>(null)

function useConsent(): ConsentContextValue {
  const context = useContext(ConsentContext)
  if (!context) throw new Error('Analytics consent provider is missing')
  return context
}

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<AnalyticsConsent>(readAnalyticsConsent)

  useEffect(() => {
    if (consent === 'accepted') startAnalytics()
  }, [consent])

  useEffect(() => {
    const unsubscribe = observeAnalyticsConsent(setConsent)
    window.addEventListener('hashchange', trackAnalyticsPage)
    document.addEventListener('click', trackAnalyticsLink)
    return () => {
      unsubscribe()
      window.removeEventListener('hashchange', trackAnalyticsPage)
      document.removeEventListener('click', trackAnalyticsLink)
    }
  }, [])

  function choose(value: 'accepted' | 'rejected') {
    saveAnalyticsConsent(value)
    if (value === 'rejected') stopAnalytics()
    setConsent(value)
  }

  return <ConsentContext.Provider value={{ consent, choose }}>{children}</ConsentContext.Provider>
}

export function AnalyticsBanner() {
  const { consent, choose } = useConsent()
  if (!isAnalyticsConfigured() || consent !== 'unknown') return null

  return (
    <aside className="analytics-banner" aria-label="Выбор аналитики">
      <p className="analytics-banner-title">Аналитика сайта</p>
      <p>Мы используем Яндекс.Метрику для анализа посещаемости. Вы можете разрешить аналитику или продолжить без неё.</p>
      <div className="analytics-choices">
        <button type="button" onClick={() => choose('accepted')}>Разрешить аналитику</button>
        <button type="button" onClick={() => choose('rejected')}>Без аналитики</button>
      </div>
      <a href="#/privacy">Подробнее о данных</a>
    </aside>
  )
}

export function AnalyticsSettings() {
  const { consent, choose } = useConsent()
  if (!isAnalyticsConfigured()) {
    return (
      <div className="analytics-settings">
        <h2>Настройки аналитики</h2>
        <p>В этой версии сайта аналитика не настроена.</p>
      </div>
    )
  }
  const status = consent === 'accepted' ? 'разрешена' : consent === 'rejected' ? 'отключена' : 'решение не принято'

  return (
    <div className="analytics-settings">
      <h2>Настройки аналитики</h2>
      <p>Сейчас аналитика: {status}. Вы можете изменить выбор в любое время. При отключении уже загруженной Метрики страница обновится; ранее переданные Яндексу данные это не удаляет.</p>
      <div className="analytics-choices">
        <button type="button" aria-pressed={consent === 'accepted'} onClick={() => choose('accepted')}>Разрешить аналитику</button>
        <button type="button" aria-pressed={consent === 'rejected'} onClick={() => choose('rejected')}>Без аналитики</button>
      </div>
    </div>
  )
}
