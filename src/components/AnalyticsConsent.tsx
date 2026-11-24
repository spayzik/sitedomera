import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Cookie } from 'lucide-react'
import { isPageRoute, useRoute } from '../router'
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
  const [consent, setConsent] = useState<AnalyticsConsent>('unknown')
  useEffect(() => setConsent(readAnalyticsConsent()), [])

  useEffect(() => {
    startAnalytics(consent)
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

export function AnalyticsBanner({ privacyHref = '#/privacy' }: { privacyHref?: string }) {
  const { consent, choose } = useConsent()
  const standalone = isPageRoute(useRoute())
  const eligible = isAnalyticsConfigured() && consent === 'unknown'
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    setVisible(false)
    if (!eligible) return
    let timer: number | undefined
    const schedule = (outsideHero: boolean) => {
      window.clearTimeout(timer)
      if (outsideHero) timer = window.setTimeout(() => setVisible(true), 800)
      else setVisible(false)
    }
    const hero = standalone ? null : document.getElementById('top')
    if (!hero) {
      schedule(true)
      return () => window.clearTimeout(timer)
    }
    const observer = new IntersectionObserver(([entry]) => {
      schedule(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0)
    })
    observer.observe(hero)
    return () => { observer.disconnect(); window.clearTimeout(timer) }
  }, [eligible, standalone])

  if (!eligible || !visible) return null

  return (
    <aside className="analytics-banner" aria-labelledby="cookie-banner-title">
      <div className="analytics-banner-copy">
        <h2 className="analytics-banner-title" id="cookie-banner-title"><span><Cookie size={17} aria-hidden="true" /></span> Настройки cookie</h2>
        <p>Сайт сохраняет корзину и настройки. С вашего разрешения мы собираем статистику посещений, чтобы улучшать сайт.</p>
        <a href={privacyHref}>Подробнее о данных</a>
      </div>
      <ConsentChoices choose={choose} />
    </aside>
  )
}

function ConsentChoices({ choose, consent }: { choose: ConsentContextValue['choose']; consent?: AnalyticsConsent }) {
  return (
    <div className="analytics-choices">
      <button type="button" aria-pressed={consent === undefined ? undefined : consent === 'accepted'} onClick={() => choose('accepted')}>Принять</button>
      <button type="button" aria-pressed={consent === undefined ? undefined : consent === 'rejected'} onClick={() => choose('rejected')}>Отклонить</button>
    </div>
  )
}

export function CookieSettingsLink() {
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  return (
    <>
      <button ref={trigger} type="button" className="cookie-settings-link" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>
        Настройки cookie
      </button>
      <dialog
        ref={dialog}
        className="cookie-dialog"
        aria-labelledby="cookie-dialog-title"
        onClose={() => trigger.current?.focus()}
        onKeyDown={event => {
          if (event.key !== 'Tab') return
          const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not([disabled])')
          const first = buttons[0]
          const last = buttons[buttons.length - 1]
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last?.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first?.focus()
          }
        }}
      >
        <div className="cookie-dialog-header">
          <h2 id="cookie-dialog-title">Настройки cookie</h2>
          <form method="dialog"><button type="submit" className="cookie-dialog-close" aria-label="Закрыть настройки cookie">×</button></form>
        </div>
        <AnalyticsSettings inDialog />
      </dialog>
    </>
  )
}

export function AnalyticsSettings({ inDialog = false }: { inDialog?: boolean }) {
  const { consent, choose } = useConsent()
  const configured = isAnalyticsConfigured()
  const status = consent === 'accepted' ? 'разрешена' : consent === 'rejected' ? 'отключена' : 'решение не принято'

  return (
    <div className="analytics-settings">
      {!inDialog && <h2>Настройки cookie</h2>}
      <dl className="cookie-categories">
        <div><dt>Необходимые данные</dt><dd>Сохраняют корзину и настройки сайта.</dd></div>
        <div><dt>Аналитика</dt><dd>Яндекс Метрика собирает статистику сайта и может записывать действия на страницах после вашего согласия.</dd></div>
      </dl>
      <p role="status">{configured ? `Аналитика: ${status}.` : 'Аналитика в этой версии сайта отключена.'}</p>
      {configured && <>
        <p>При отзыве согласия передача новых событий прекратится. Ранее переданные Яндексу данные сохраняются у сервиса по его правилам.</p>
        <ConsentChoices choose={choose} consent={consent} />
      </>}
    </div>
  )
}
