export type AnalyticsConsent = 'unknown' | 'accepted' | 'rejected'

const goals = [
  'catalog_view', 'product_view', 'cart_add', 'calculator_complete', 'quiz_complete',
  'telegram_click', 'phone_click', 'lead_submit',
] as const
type AnalyticsGoal = typeof goals[number]

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
let pendingCalls: unknown[][] | undefined
const pageRoutes = new Set(['/catalog', '/privacy', '/offer'])

export function isAnalyticsConfigured(): boolean {
  return counterId !== null
}

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

export function observeAnalyticsConsent(onChange: (consent: AnalyticsConsent) => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== consentKey && event.key !== null) return
    try {
      if (!event.storageArea || event.storageArea !== window.localStorage) return
    } catch {
      return
    }
    const consent = readAnalyticsConsent()
    if (consent !== 'accepted') stopAnalytics()
    onChange(consent)
  }
  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}

function pageUrl(): string {
  const hash = window.location.hash.slice(1).split('?')[0]
  const route = pageRoutes.has(hash) ? `#${hash}` : ''
  return `${window.location.origin}/${route}`
}

export function startAnalytics(): void {
  if (counterId === null || scriptState !== 'idle') return
  allowed = true
  const metrikaWindow = window as MetrikaWindow
  if (typeof metrikaWindow.ym !== 'function') {
    const queue: unknown[][] = []
    pendingCalls = queue
    metrikaWindow.ym = Object.assign((...args: unknown[]) => { queue.push(args) }, { a: queue, l: Date.now() })
  }
  // Queue init using Yandex's documented loader pattern; tag.js runs it after loading.
  metrikaWindow.ym(counterId, 'init', {
    defer: true,
    trackLinks: false,
    accurateTrackBounce: false,
    clickmap: false,
    webvisor: false,
    trackHash: false,
  })
  const script = document.createElement('script')
  script.src = scriptUrl
  script.async = true
  script.onload = () => {
    pendingCalls = undefined
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
  try { ym(counterId, 'hit', url, { referer: lastHitUrl }) } catch { return }
  lastHitUrl = url
  if (url.endsWith('#/catalog')) trackAnalyticsGoal('catalog_view')
}

export function trackAnalyticsGoal(goal: AnalyticsGoal): void {
  if (!allowed || scriptState !== 'ready' || counterId === null || !goals.includes(goal)) return
  // The method takes only a fixed identifier. Never pass links or customer input.
  try { (window as MetrikaWindow).ym?.(counterId, 'reachGoal', goal) } catch { /* Analytics is optional. */ }
}

export function trackAnalyticsLink(event: MouseEvent): void {
  if (!(event.target instanceof Element)) return
  const link = event.target.closest<HTMLAnchorElement>('a[href]')
  if (!link) return
  if (link.protocol === 'tel:') trackAnalyticsGoal('phone_click')
  if (link.protocol === 'https:' && link.hostname === 't.me') trackAnalyticsGoal('telegram_click')
}

export function stopAnalytics(): void {
  if (!allowed) return
  allowed = false
  if (pendingCalls) pendingCalls.length = 0
  if (counterId !== null) {
    // Yandex's opt-out flag also covers revocation during tag.js loading.
    const globalValues = window as unknown as Record<string, unknown>
    globalValues[`disableYaCounter${counterId}`] = true
    const ym = (window as MetrikaWindow).ym
    try {
      if (scriptState === 'ready' && typeof ym === 'function') ym(counterId, 'destruct')
    } catch {
      // Continue with opt-out and reload even if the external API fails.
    }
  }
  window.location.reload() // Unload the third-party script already running in this tab.
}
