import { feedOfferId } from '../data/feedOfferIds.ts'
import { CONTACTS } from '../data/products.ts'

export type AnalyticsConsent = 'unknown' | 'accepted' | 'rejected'

const goals = [
  'catalog_view', 'product_view', 'cart_add', 'calculator_complete', 'quiz_complete',
  'telegram_click', 'whatsapp_click', 'max_click', 'phone_click', 'external_click',
  'catalog_search', 'catalog_filter', 'calculator_start', 'cart_remove', 'cart_view',
  'lead_start', 'lead_submit', 'lead_error', 'sample_request', 'installation_request', 'b2b_request',
] as const
type AnalyticsGoal = typeof goals[number] | 'begin_checkout'

const consentKey = 'domera-analytics-consent-v1'
const scriptUrl = 'https://mc.yandex.ru/metrika/tag.js'
const preview = import.meta.env.VITE_DEKORAY_PREVIEW === '1'
function parseCounterId(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

const productionCounter = parseCounterId(import.meta.env.VITE_YM_ID)
const stagingCounter = parseCounterId(import.meta.env.VITE_YM_STAGING_ID)
const counterId = preview
  ? stagingCounter === productionCounter || stagingCounter === 114347066 ? null : stagingCounter
  : productionCounter
const webvisor = import.meta.env.VITE_YM_WEBVISOR === '1'

type MetrikaWindow = Window & { ym?: (...args: unknown[]) => void; dataLayer?: unknown[] }

let scriptState: 'idle' | 'loading' | 'ready' | 'failed' = 'idle'
let allowed = false
let lastHitUrl = ''
let pendingCalls: unknown[][] | undefined
let counterReady: Promise<boolean> | undefined
let resolveCounterReady: ((ready: boolean) => void) | undefined
const attributionSources = new Set(['yandex', 'google', 'avito', 'telegram', 'vk', '2gis', 'direct'])
const attributionMedia = new Set(['organic', 'cpc', 'referral', 'social', 'email', 'display', 'qr'])

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
  const { origin, pathname } = window.location
  return origin + pathname
}

function initialAttribution(url: string): string {
  const result = new URL(url)
  const query = new URLSearchParams(window.location.search)
  const source = query.get('utm_source')?.toLowerCase()
  const medium = query.get('utm_medium')?.toLowerCase()
  if (source && attributionSources.has(source)) result.searchParams.set('utm_source', source)
  if (medium && attributionMedia.has(medium)) result.searchParams.set('utm_medium', medium)
  // Use numeric campaign identifiers; arbitrary campaign text may contain personal data.
  const campaign = query.get('utm_campaign')
  if (campaign && /^[0-9]{1,9}$/.test(campaign)) result.searchParams.set('utm_campaign', campaign)
  return result.href
}

function referringOrigin(): string {
  try {
    const referrer = new URL(document.referrer)
    return ['http:', 'https:'].includes(referrer.protocol) ? referrer.origin + '/' : ''
  } catch {
    return ''
  }
}

export function startAnalytics(consent: AnalyticsConsent): void {
  if (consent !== 'accepted' || counterId === null || scriptState !== 'idle' ||
    (!preview && window.location.origin !== CONTACTS.origin) ||
    document.getElementById('root')?.dataset.path === '/404/') return
  allowed = true
  const metrikaWindow = window as MetrikaWindow
  if (typeof metrikaWindow.ym !== 'function') {
    const queue: unknown[][] = []
    pendingCalls = queue
    metrikaWindow.ym = Object.assign((...args: unknown[]) => { queue.push(args) }, { a: queue, l: Date.now() })
  }
  // Queue init using Yandex's documented loader pattern; tag.js runs it after loading.
  metrikaWindow.dataLayer ??= []
  metrikaWindow.ym(counterId, 'init', {
    defer: true,
    trackLinks: false,
    accurateTrackBounce: true,
    clickmap: true,
    webvisor,
    ecommerce: 'dataLayer',
    disableYtm: true,
    trackHash: false,
  })
  const script = document.createElement('script')
  script.src = scriptUrl
  script.async = true
  script.referrerPolicy = 'origin'
  counterReady = new Promise(resolve => { resolveCounterReady = resolve })
  script.onload = () => {
    pendingCalls = undefined
    if (!allowed || typeof metrikaWindow.ym !== 'function') {
      scriptState = 'failed'
      resolveCounterReady?.(false)
      return
    }
    scriptState = 'ready'
    trackAnalyticsPage() // Send one sanitized initial page view after deferred init.
    resolveCounterReady?.(true)
  }
  script.onerror = () => {
    scriptState = 'failed'
    resolveCounterReady?.(false)
  }
  scriptState = 'loading'
  document.head.appendChild(script)
}

export function trackAnalyticsPage(): void {
  if (!allowed || scriptState !== 'ready' || counterId === null) return
  const url = pageUrl()
  if (url === lastHitUrl) return
  const ym = (window as MetrikaWindow).ym
  if (typeof ym !== 'function') return
  try {
    ym(counterId, 'hit', lastHitUrl ? url : initialAttribution(url), { referer: lastHitUrl || referringOrigin() })
  } catch { return }
  lastHitUrl = url
  const catalogPath = new URL(url).pathname.match(/(?:^|\/)catalog(?:\/([^/]+))?(?:\/([^/]+))?\/?$/)
  if (catalogPath?.[2]) {
    const product = document.querySelector<HTMLElement>('[data-analytics-product]')?.dataset
    if (product?.analyticsProduct) {
      trackAnalyticsProductView({ id: product.analyticsProduct, priceRub: Number(product.analyticsPrice) })
    }
  } else if (catalogPath) trackAnalyticsGoal('catalog_view')
}

export function trackAnalyticsGoal(goal: AnalyticsGoal): void {
  if (!allowed || scriptState !== 'ready' || counterId === null ||
    (goal !== 'begin_checkout' && !goals.includes(goal))) return
  // The method takes only a fixed identifier. Never pass links or customer input.
  try { (window as MetrikaWindow).ym?.(counterId, 'reachGoal', goal) } catch { /* Analytics is optional. */ }
}

export function trackAnalyticsLink(event: MouseEvent): void {
  if (event.defaultPrevented || !(event.target instanceof Element)) return
  const link = event.target.closest<HTMLAnchorElement>('a[href]')
  if (!link) return
  if (link.protocol === 'tel:') trackAnalyticsGoal('phone_click')
  if (link.protocol !== 'https:' || link.hostname === window.location.hostname) return
  if (link.hostname === 't.me') trackAnalyticsGoal('telegram_click')
  if (link.hostname === 'wa.me' || link.hostname === 'api.whatsapp.com') trackAnalyticsGoal('whatsapp_click')
  if (link.hostname === 'max.ru' || link.hostname === 'web.max.ru') trackAnalyticsGoal('max_click')
  trackAnalyticsGoal('external_click')
  if (!allowed || scriptState !== 'ready' || counterId === null) return
  // The report groups destinations by public origin without draft messages or account paths.
  try { (window as MetrikaWindow).ym?.(counterId, 'extLink', link.origin + '/') } catch { /* Optional. */ }
}

type AnalyticsProduct = { id: string; priceRub: number }
type AnalyticsOrderItem = AnalyticsProduct & { quantity: number }
type AnalyticsOrder = { transactionId: string; valueRub: number; items: readonly AnalyticsOrderItem[] }
type VerifiedAnalyticsPurchase = AnalyticsOrder & { status: 'succeeded'; verified: true }
const orderIdPattern = /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i

function ecommerceDataLayer(): unknown[] | undefined {
  if (!allowed || scriptState !== 'ready' || counterId === null) return
  return (window as MetrikaWindow).dataLayer
}

function trackEcommerce(action: 'detail' | 'add' | 'remove', product: AnalyticsProduct, quantity?: number): void {
  const dataLayer = ecommerceDataLayer()
  if (!dataLayer) return
  const id = feedOfferId(product.id)
  if (!id || !Number.isFinite(product.priceRub) || product.priceRub < 0) return
  const item = { id, price: product.priceRub, ...(quantity === undefined ? {} : { quantity }) }
  dataLayer.push({ ecommerce: { currencyCode: 'RUB', [action]: { products: [item] } } })
}

export function trackAnalyticsProductView(product: AnalyticsProduct): void {
  trackAnalyticsGoal('product_view')
  trackEcommerce('detail', product)
}

export function trackAnalyticsCart(action: 'add' | 'remove', product: AnalyticsProduct, quantity: number): void {
  if (!Number.isSafeInteger(quantity) || quantity < 1) return
  trackAnalyticsGoal(action === 'add' ? 'cart_add' : 'cart_remove')
  trackEcommerce(action, product, quantity)
}

function orderProducts(order: AnalyticsOrder) {
  const total = Math.round(order.valueRub * 100)
  if (!orderIdPattern.test(order.transactionId) || !Number.isSafeInteger(total) || total <= 0 ||
    order.items.length === 0) return
  const products: { id: string; price: number; quantity: number }[] = []
  let merchandise = 0
  for (const { id: productId, priceRub, quantity } of order.items) {
    const id = feedOfferId(productId)
    const unitPrice = Math.round(priceRub * 100)
    if (!id || !Number.isSafeInteger(unitPrice) || unitPrice <= 0 ||
      !Number.isSafeInteger(quantity) || quantity < 1) return
    merchandise += unitPrice * quantity
    products.push({ id, price: unitPrice / 100, quantity })
  }
  if (!Number.isSafeInteger(merchandise) || merchandise > total) return
  return { products, total: total / 100, merchandise: merchandise / 100 }
}

function claimCommerceEvent(key: string): boolean {
  if (localStorage.getItem(key)) return false
  localStorage.setItem(key, '1')
  return true
}

export function trackAnalyticsCheckout(order: AnalyticsOrder): boolean {
  const dataLayer = ecommerceDataLayer()
  const details = orderProducts(order)
  if (!dataLayer || !details) return false
  const items = details.products.map(({ id, price, quantity }) => ({ item_id: id, price, quantity }))
  // Metrika accepts GA4 ecommerce. The JS goal makes checkout selectable in its funnel.
  const event = { event: 'begin_checkout', ecommerce: { currency: 'RUB', value: details.merchandise, items } }
  if (JSON.stringify(event).length > 8192) return false
  try {
    if (!claimCommerceEvent(`dekoray-metrika-checkout:${counterId}:${order.transactionId.toLowerCase()}`)) return false
    dataLayer.push(event)
    trackAnalyticsGoal('begin_checkout')
    return true
  } catch {
    return false
  }
}

export async function trackAnalyticsPurchase(order: VerifiedAnalyticsPurchase): Promise<boolean> {
  if (order.status !== 'succeeded' || order.verified !== true) return false
  const details = orderProducts(order)
  if (!details) return false
  if (scriptState === 'idle') startAnalytics(readAnalyticsConsent())
  if (!allowed || !(await counterReady)) return false

  const transactionId = order.transactionId.toLowerCase()
  const event = {
    ecommerce: {
      currencyCode: 'RUB',
      purchase: { actionField: { id: transactionId, revenue: details.total }, products: details.products },
    },
  }
  if (JSON.stringify(event).length > 8192) return false
  const key = `dekoray-metrika-purchase:${counterId}:${transactionId}`
  function sendOnce() {
    const dataLayer = ecommerceDataLayer()
    if (!dataLayer || !claimCommerceEvent(key)) return false
    dataLayer.push(event)
    return true
  }
  try {
    // A second checkout tab can observe the same payment before its storage event arrives.
    return navigator.locks ? await navigator.locks.request(key, sendOnce) : sendOnce()
  } catch {
    return false
  }
}

export function stopAnalytics(): void {
  if (!allowed) return
  allowed = false
  resolveCounterReady?.(false)
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
