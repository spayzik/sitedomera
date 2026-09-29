export type AnalyticsConsent = 'unknown' | 'accepted' | 'rejected'

const consentKey = 'domera-analytics-consent-v1'
const scriptUrl = 'https://mc.yandex.ru/metrika/tag.js'
const configuredId = import.meta.env.VITE_YM_ID
const counterId = typeof configuredId === 'string' && /^\d+$/.test(configuredId) && Number.isSafeInteger(Number(configuredId)) && Number(configuredId) > 0
  ? Number(configuredId)
  : null

type MetrikaWindow = Window & { ym?: (...args: unknown[]) => void }

let scriptState: 'idle' | 'loading' | 'ready' | 'failed' = 'idle'
let allowed = false
let lastHitUrl = ''

export function readAnalyticsConsent(): AnalyticsConsent {
  try {
    const value = localStorage.getItem(consentKey)
    return value === 'accepted' || value === 'rejected' ? value : 'unknown'
  } catch {
    return 'unknown'
  }
}

export function saveAnalyticsConsent(value: 'accepted' | 'rejected'): void {
  try {
    localStorage.setItem(consentKey, value)
  } catch {
    // The choice still applies to this page when browser storage is unavailable.
  }
}

function pageUrl(): string {
  const routes = new Set(['/catalog', '/privacy', '/offer'])
  const sections = new Set(['top', 'manifest', 'specs', 'why', 'catalog', 'quiz', 'installation', 'interiors', 'reviews', 'compare', 'calculator', 'showroom', 'faq', 'products'])
  const hash = window.location.hash.slice(1).split('?')[0]
  const route = routes.has(hash) || sections.has(hash) ? `#${hash}` : ''
  return `${window.location.origin}${window.location.pathname}${route}`
}

export function startAnalytics(): void {
  if (counterId === null || scriptState !== 'idle') return
  allowed = true
  const metrikaWindow = window as MetrikaWindow
  if (typeof metrikaWindow.ym !== 'function') {
    const queue: unknown[][] = []
    metrikaWindow.ym = Object.assign((...args: unknown[]) => { queue.push(args) }, { a: queue, l: Date.now() })
  }
  // Queue init using Yandex's documented loader pattern; tag.js runs it after loading.
  metrikaWindow.ym(counterId, 'init', {
    defer: true,
    trackLinks: true,
    accurateTrackBounce: true,
    clickmap: false,
    webvisor: false,
    trackHash: false,
  })
  const script = document.createElement('script')
  script.src = scriptUrl
  script.async = true
  script.onload = () => {
    if (!allowed || typeof metrikaWindow.ym !== 'function') {
      scriptState = 'failed'
      return
    }
    scriptState = 'ready'
    trackAnalyticsPage() // Send one sanitized initial page view after deferred init.
  }
  script.onerror = () => { scriptState = 'failed' }
  scriptState = 'loading'
  document.head.appendChild(script)
}

export function trackAnalyticsPage(): void {
  if (!allowed || scriptState !== 'ready' || counterId === null) return
  const url = pageUrl()
  if (url === lastHitUrl) return
  const ym = (window as MetrikaWindow).ym
  if (typeof ym !== 'function') return
  ym(counterId, 'hit', url)
  lastHitUrl = url
}

export function stopAnalytics(): void {
  allowed = false
  if (counterId !== null) {
    const ym = (window as MetrikaWindow).ym
    try {
      if (scriptState === 'ready' && typeof ym === 'function') ym(counterId, 'destruct')
    } catch {
      // Continue with opt-out and reload even if the external API fails.
    }
    // Yandex's opt-out flag stops an already initialized counter before reload.
    const globalValues = window as unknown as Record<string, unknown>
    globalValues[`disableYaCounter${counterId}`] = true
  }
}
