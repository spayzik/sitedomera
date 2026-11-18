import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import { test } from 'node:test'

const counter = 114347066
const source = await readFile(new URL('../src/lib/analytics.ts', import.meta.url), 'utf8')
const js = stripTypeScriptTypes(source.replace(
  'import.meta.env.VITE_YM_ID',
  JSON.stringify(String(counter)),
))
const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(js).toString('base64')

async function browserHarness(t) {
  const scriptNodes = []
  const calls = []
  const storage = new Map()
  const listeners = new Map()
  const reloads = []
  const origin = 'https://xn--80ahdrdyo.xn--p1ai'
  const browser = {
    location: { origin, hash: '', reload: () => reloads.push(true) },
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
    }
    closest() { return this }
  }
  const mocks = {
    window: browser,
    document: {
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
  const analytics = await import(moduleUrl + '#' + encodeURIComponent(t.name))
  function finishScript() {
    calls.push(...browser.ym.a)
    browser.ym = (...args) => calls.push(args)
    scriptNodes[0].onload()
  }
  function storageEvent(key, value, storageArea = mocks.localStorage) {
    if (storageArea === mocks.localStorage) {
      if (key === null) storage.clear()
      else if (value === null) storage.delete(key)
      else storage.set(key, value)
    }
    listeners.get('storage')?.({ key, storageArea })
  }
  return { analytics, browser, calls, finishScript, origin, reloads, scriptNodes, storageEvent, TestLink }
}

test('consent controls initialization, SPA hits and fixed goal identifiers', async (t) => {
  const { analytics, browser, calls, finishScript, origin, reloads, scriptNodes, TestLink } = await browserHarness(t)
  assert.equal(analytics.readAnalyticsConsent(), 'unknown')
  analytics.trackAnalyticsPage()
  analytics.trackAnalyticsGoal('lead_submit')
  assert.equal(scriptNodes.length, 0)
  assert.deepEqual(calls, [])

  analytics.saveAnalyticsConsent('accepted')
  assert.equal(analytics.readAnalyticsConsent(), 'accepted')
  browser.location.hash = '#/catalog?phone=private'
  analytics.startAnalytics()
  analytics.startAnalytics()
  analytics.trackAnalyticsGoal('lead_submit')
  assert.equal(scriptNodes.length, 1)
  assert.equal(scriptNodes[0].src, 'https://mc.yandex.ru/metrika/tag.js')
  finishScript()
  assert.deepEqual(calls[0], [counter, 'init', {
    defer: true, trackLinks: false, accurateTrackBounce: false, clickmap: false, webvisor: false,
    trackHash: false,
  }])
  assert.deepEqual(calls.slice(1), [
    [counter, 'hit', origin + '/#/catalog', { referer: '' }],
    [counter, 'reachGoal', 'catalog_view'],
  ])
  analytics.trackAnalyticsPage()
  assert.equal(calls.length, 3)
  browser.location.hash = '#/privacy'
  analytics.trackAnalyticsPage()
  assert.deepEqual(calls[3], [counter, 'hit', origin + '/#/privacy', { referer: origin + '/#/catalog' }])
  analytics.trackAnalyticsLink({ target: new TestLink('https://t.me/example?text=private') })
  analytics.trackAnalyticsLink({ target: new TestLink('tel:+70000000001') })
  analytics.trackAnalyticsLink({ target: new TestLink('https://t.me.example.org/') })
  analytics.trackAnalyticsGoal('unrecognized_goal')
  analytics.trackAnalyticsGoal('lead_submit')
  assert.deepEqual(calls.slice(4), [
    [counter, 'reachGoal', 'telegram_click'],
    [counter, 'reachGoal', 'phone_click'],
    [counter, 'reachGoal', 'lead_submit'],
  ])
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
  analytics.startAnalytics()
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
    if (consent === 'accepted') analytics.startAnalytics()
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
  analytics.startAnalytics()
  analytics.observeAnalyticsConsent(() => {})
  storageEvent(key, 'rejected')
  storageEvent(null, null)
  finishScript()
  assert.deepEqual(reloads, [true])
  assert.equal(browser['disableYaCounter' + counter], true)
  assert.deepEqual(calls, [])
})
