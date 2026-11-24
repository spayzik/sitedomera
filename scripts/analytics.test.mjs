import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import { test } from 'node:test'

const counter = 114347066
const productId = 'pdf2026-p10-r2c1'
const offerId = 'a2c5495ca4f49e723428'
const priceRub = 8000
const checkout = {
  transactionId: '84725625-9dbc-4b4b-8fb9-aa15b108cdb4',
  valueRub: 16500,
  items: [{ id: productId, priceRub, quantity: 2 }],
}
const purchase = {
  ...checkout,
  status: 'succeeded',
  verified: true,
}
const source = await readFile(new URL('../src/lib/analytics.ts', import.meta.url), 'utf8')
function moduleUrlFor(env) {
  const prepared = source
    .replace(/'\.\.\/data\/([A-Za-z]+\.ts)'/g, (_, file) => JSON.stringify(new URL('../src/data/' + file, import.meta.url).href))
    .replace(/import\.meta\.env\.(VITE_[A-Z_]+)/g, (_, key) => JSON.stringify(env[key]) ?? 'undefined')
  const js = stripTypeScriptTypes(prepared)
  return 'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
}

async function browserHarness(t, env = { VITE_YM_ID: String(counter) }) {
  const scriptNodes = []
  const calls = []
  const storage = new Map()
  const listeners = new Map()
  const reloads = []
  const origin = 'https://xn--80ahdrdyo.xn--p1ai'
  const browser = {
    location: { origin, protocol: 'https:', hostname: new URL(origin).hostname, pathname: '/', search: '', hash: '', reload: () => reloads.push(true) },
    addEventListener: (name, onEvent) => listeners.set(name, onEvent),
    removeEventListener: (name, onEvent) => {
      if (listeners.get(name) === onEvent) listeners.delete(name)
    },
  }
  class TestLink {
    constructor(href) {
      const url = new URL(href, origin)
      this.protocol = url.protocol
      this.hostname = url.hostname
      this.origin = url.origin
    }
    closest() { return this }
  }
  const mocks = {
    window: browser,
    document: {
      referrer: 'https://search.example/?q=private',
      getElementById: () => null,
      querySelector: () => null,
      createElement: () => ({}),
      head: { appendChild: (node) => scriptNodes.push(node) },
    },
    localStorage: {
      getItem: (key) => storage.get(key),
      setItem: (key, value) => storage.set(key, value),
    },
    Element: TestLink,
  }
  browser.localStorage = mocks.localStorage
  for (const [key, value] of Object.entries(mocks)) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key)
    Object.defineProperty(globalThis, key, { value, configurable: true })
    t.after(() => {
      if (old) Object.defineProperty(globalThis, key, old)
      else delete globalThis[key]
    })
  }
  const url = moduleUrlFor(env) + '#' + encodeURIComponent(t.name)
  const analytics = await import(url)
  function finishScript() {
    calls.push(...browser.ym.a)
    browser.ym = (...args) => calls.push(args)
    scriptNodes.at(-1).onload()
  }
  function storageEvent(key, value, storageArea = mocks.localStorage) {
    if (storageArea === mocks.localStorage) {
      if (key === null) storage.clear()
      else if (value === null) storage.delete(key)
      else storage.set(key, value)
    }
    listeners.get('storage')?.({ key, storageArea })
  }
  return { analytics, browser, calls, finishScript, origin, reloads, scriptNodes, storageEvent, TestLink,
    freshAnalytics: () => import(url + '-reload') }
}

test('consent controls initialization, SPA hits and fixed goal identifiers', async (t) => {
  const { analytics, browser, calls, finishScript, origin, reloads, scriptNodes, TestLink } = await browserHarness(t)
  assert.equal(analytics.readAnalyticsConsent(), 'unknown')
  analytics.startAnalytics('unknown')
  analytics.startAnalytics('rejected')
  analytics.trackAnalyticsPage()
  analytics.trackAnalyticsGoal('lead_submit')
  assert.equal(scriptNodes.length, 0)
  assert.deepEqual(calls, [])

  analytics.saveAnalyticsConsent('accepted')
  assert.equal(analytics.readAnalyticsConsent(), 'accepted')
  browser.location.pathname = '/catalog/'
  browser.location.search = '?phone=private&utm_source=yandex&utm_medium=cpc&utm_campaign=123&utm_term=private'
  analytics.startAnalytics('accepted')
  analytics.startAnalytics('accepted')
  analytics.trackAnalyticsGoal('lead_submit')
  assert.equal(scriptNodes.length, 1)
  assert.equal(scriptNodes[0].src, 'https://mc.yandex.ru/metrika/tag.js')
  finishScript()
  assert.deepEqual(calls[0], [counter, 'init', {
    defer: true, trackLinks: false, accurateTrackBounce: true, clickmap: true, webvisor: false,
    ecommerce: 'dataLayer', disableYtm: true,
    trackHash: false,
  }])
  assert.deepEqual(calls.slice(1), [
    [counter, 'hit', origin + '/catalog/?utm_source=yandex&utm_medium=cpc&utm_campaign=123', { referer: 'https://search.example/' }],
    [counter, 'reachGoal', 'catalog_view'],
  ])
  analytics.trackAnalyticsPage()
  assert.equal(calls.length, 3)
  browser.location.pathname = '/politika-konfidencialnosti/'
  analytics.trackAnalyticsPage()
  assert.deepEqual(calls[3], [counter, 'hit', origin + '/politika-konfidencialnosti/', { referer: origin + '/catalog/' }])
  analytics.trackAnalyticsLink({ target: new TestLink('https://t.me/example?text=private'), defaultPrevented: true })
  analytics.trackAnalyticsLink({ target: new TestLink('https://t.me/example?text=private') })
  analytics.trackAnalyticsLink({ target: new TestLink('tel:+70000000001') })
  analytics.trackAnalyticsLink({ target: new TestLink('https://t.me.example.org/') })
  analytics.trackAnalyticsGoal('unrecognized_goal')
  analytics.trackAnalyticsGoal('lead_submit')
  assert.deepEqual(calls.slice(4), [
    [counter, 'reachGoal', 'telegram_click'],
    [counter, 'reachGoal', 'external_click'],
    [counter, 'extLink', 'https://t.me/'],
    [counter, 'reachGoal', 'phone_click'],
    [counter, 'reachGoal', 'external_click'],
    [counter, 'extLink', 'https://t.me.example.org/'],
    [counter, 'reachGoal', 'lead_submit'],
  ])
  analytics.trackAnalyticsCart('add', { id: productId, priceRub }, 2)
  assert.deepEqual(browser.dataLayer, [{ ecommerce: { currencyCode: 'RUB', add: { products: [{ id: offerId, price: priceRub, quantity: 2 }] } } }])
  assert.doesNotMatch(JSON.stringify(calls), /private/)
  analytics.saveAnalyticsConsent('rejected')
  analytics.stopAnalytics()
  assert.equal(analytics.readAnalyticsConsent(), 'rejected')
  assert.equal(browser['disableYaCounter' + counter], true)
  assert.equal(reloads.length, 1)
  assert.deepEqual(calls.at(-1), [counter, 'destruct'])
  const countAfterRevoke = calls.length
  analytics.trackAnalyticsPage()
  analytics.trackAnalyticsGoal('lead_submit')
  assert.equal(calls.length, countAfterRevoke)
})

test('withdrawal while the counter is loading clears queued initialization', async (t) => {
  const { analytics, browser, calls, finishScript } = await browserHarness(t)
  analytics.saveAnalyticsConsent('accepted')
  analytics.startAnalytics('accepted')
  assert.equal(browser.ym.a.length, 1)
  analytics.saveAnalyticsConsent('rejected')
  analytics.stopAnalytics()
  finishScript()
  assert.deepEqual(calls, [])
})

test('withdrawal in another tab stops a ready counter and storage clear needs a fresh choice', async (t) => {
  const { analytics, calls, finishScript, reloads, scriptNodes, storageEvent } = await browserHarness(t)
  const consentChanges = []
  const unobserve = analytics.observeAnalyticsConsent((consent) => {
    consentChanges.push(consent)
    if (consent === 'accepted') analytics.startAnalytics('accepted')
  })
  const key = 'domera-analytics-consent-v1'
  storageEvent(key, 'accepted')
  finishScript()
  storageEvent(key, 'rejected', {})
  storageEvent('unrelated', null)
  assert.deepEqual(reloads, [])
  assert.deepEqual(consentChanges, ['accepted'])

  storageEvent(null, null)
  assert.deepEqual(reloads, [true])
  assert.deepEqual(calls.at(-1), [counter, 'destruct'])
  storageEvent(key, 'rejected')
  assert.deepEqual(reloads, [true])
  storageEvent(key, 'accepted')
  assert.equal(scriptNodes.length, 1, 'The revoked tab does not restart the loaded tag before reload')
  const lastCall = calls.at(-1)
  analytics.trackAnalyticsGoal('lead_submit')
  assert.deepEqual(calls.at(-1), lastCall)
  assert.deepEqual(consentChanges, ['accepted', 'unknown', 'rejected', 'accepted'])

  unobserve()
  storageEvent(key, null)
  assert.equal(consentChanges.length, 4)
})

test('withdrawal in another tab cancels a pending counter exactly once', async (t) => {
  const { analytics, browser, calls, finishScript, reloads, storageEvent } = await browserHarness(t)
  const key = 'domera-analytics-consent-v1'
  analytics.saveAnalyticsConsent('accepted')
  analytics.startAnalytics('accepted')
  analytics.observeAnalyticsConsent(() => {})
  storageEvent(key, 'rejected')
  storageEvent(null, null)
  finishScript()
  assert.deepEqual(reloads, [true])
  assert.equal(browser['disableYaCounter' + counter], true)
  assert.deepEqual(calls, [])
})


test('SSG detail page reports one product view and one ecommerce detail without search input', async (t) => {
  const { analytics, browser, calls, finishScript, origin } = await browserHarness(t)
  browser.location.pathname = '/catalog/tkan/a9001/'
  browser.location.search = '?q=person%40example.invalid'
  document.querySelector = () => ({ dataset: { analyticsProduct: productId, analyticsPrice: String(priceRub) } })
  analytics.startAnalytics('accepted')
  finishScript()
  analytics.trackAnalyticsPage()
  assert.deepEqual(calls.slice(1), [
    [counter, 'hit', origin + '/catalog/tkan/a9001/', { referer: 'https://search.example/' }],
    [counter, 'reachGoal', 'product_view'],
  ])
  assert.deepEqual(browser.dataLayer, [{ ecommerce: { currencyCode: 'RUB', detail: { products: [{ id: offerId, price: priceRub }] } } }])
})

test('preview rejects the production counter even with alternative decimal encoding', async (t) => {
  const { analytics, scriptNodes } = await browserHarness(t, { VITE_DEKORAY_PREVIEW: '1', VITE_YM_STAGING_ID: '0' + counter })
  assert.equal(analytics.isAnalyticsConfigured(), false)
  analytics.startAnalytics('accepted')
  assert.equal(scriptNodes.length, 0)
})

test('production counter never initializes outside the canonical HTTPS origin or on a custom 404', async (t) => {
  const { analytics, browser, scriptNodes } = await browserHarness(t)
  const origin = browser.location.origin
  browser.location.origin = 'https://spayzik.github.io'
  analytics.startAnalytics('accepted')
  browser.location.origin = 'http://localhost:5173'
  analytics.startAnalytics('accepted')
  browser.location.origin = origin.replace('https:', 'http:')
  analytics.startAnalytics('accepted')
  browser.location.origin = origin
  document.getElementById = () => ({ dataset: { path: '/404/' } })
  analytics.startAnalytics('accepted')
  assert.equal(scriptNodes.length, 0)
})

test('checkout queues a GA4 event for catalog items and a Metrika funnel goal', async (t) => {
  const { analytics, browser, calls, finishScript } = await browserHarness(t)
  assert.equal(analytics.trackAnalyticsCheckout(checkout), false)
  analytics.startAnalytics('accepted')
  finishScript()
  assert.equal(analytics.trackAnalyticsCheckout({ ...checkout, valueRub: 1 }), false)
  assert.equal(analytics.trackAnalyticsCheckout({
    ...checkout, items: [{ id: 'unrecognized_phone_79999999999', priceRub, quantity: 2 }],
  }), false)
  assert.equal(analytics.trackAnalyticsCheckout(checkout), true)
  assert.equal(analytics.trackAnalyticsCheckout(checkout), false)
  assert.deepEqual(browser.dataLayer, [{
    event: 'begin_checkout',
    ecommerce: { currency: 'RUB', value: 16000, items: [{ item_id: offerId, price: priceRub, quantity: 2 }] },
  }])
  assert.deepEqual(calls.at(-1), [counter, 'reachGoal', 'begin_checkout'])
  assert.doesNotMatch(JSON.stringify(browser.dataLayer), /phone|79999999999/)
})

test('purchase waits for the accepted tag and records a provider-verified RUB purchase once', async (t) => {
  const { analytics, browser, calls, finishScript, freshAnalytics } = await browserHarness(t)
  assert.equal(await analytics.trackAnalyticsPurchase(purchase), false)
  analytics.startAnalytics('accepted')
  assert.equal(await analytics.trackAnalyticsPurchase({ ...purchase, status: 'pending' }), false)
  assert.equal(await analytics.trackAnalyticsPurchase({ ...purchase, verified: false }), false)
  assert.equal(await analytics.trackAnalyticsPurchase({ ...purchase, transactionId: 'user@example.invalid' }), false)
  const first = analytics.trackAnalyticsPurchase({ ...purchase, paymentToken: 'hidden-token' })
  const replay = analytics.trackAnalyticsPurchase(purchase)
  finishScript()
  assert.deepEqual(await Promise.all([first, replay]), [true, false])
  assert.deepEqual(browser.dataLayer, [{
    ecommerce: {
      currencyCode: 'RUB',
      purchase: {
        actionField: { id: purchase.transactionId, revenue: purchase.valueRub },
        products: [{ id: offerId, price: priceRub, quantity: 2 }],
      },
    },
  }])
  assert.doesNotMatch(JSON.stringify(browser.dataLayer), /hidden-token|example\.invalid/)
  const afterReload = await freshAnalytics()
  // Simulate a new page view reusing the same browser storage.
  browser.ym = undefined
  browser.dataLayer = undefined
  afterReload.startAnalytics('accepted')
  finishScript()
  assert.equal(await afterReload.trackAnalyticsPurchase(purchase), false)
  assert.deepEqual(browser.dataLayer, [])
  assert.equal(calls.filter(call => call[1] === 'reachGoal' && call[2] === 'purchase').length, 0)
})

test('withdrawal suppresses a purchase waiting for initialization', async (t) => {
  const { analytics, browser, finishScript } = await browserHarness(t)
  analytics.startAnalytics('accepted')
  const queued = analytics.trackAnalyticsPurchase(purchase)
  analytics.stopAnalytics()
  finishScript()
  assert.equal(await queued, false)
  assert.deepEqual(browser.dataLayer, [])
})
