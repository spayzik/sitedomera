import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createServer } from 'vite'

// This fixture intercepts the analytics script. Provider registration and recordings require a real account.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href : 'playwright')
const counter = '90000009'
const key = 'domera-analytics-consent-v1'
const privateSearch = 'person@example.invalid'
const server = await createServer({
  server: { host: '127.0.0.1', port: 43920, strictPort: true },
  define: {
    'import.meta.env.VITE_DEKORAY_PREVIEW': JSON.stringify('1'),
    'import.meta.env.VITE_YM_ID': JSON.stringify('114347066'),
    'import.meta.env.VITE_YM_STAGING_ID': JSON.stringify(counter),
    'import.meta.env.VITE_YM_WEBVISOR': JSON.stringify('1'),
  },
})
let browser

try {
  await server.listen()
  browser = await chromium.launch({ executablePath: process.env.BROWSER_EXE })
  const base = 'http://127.0.0.1:' + server.httpServer.address().port + '/'
  for (const width of [360, 390, 768, 1024, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 850 }, reducedMotion: 'reduce' })
    const errors = []
    let requests = 0
    page.on('pageerror', error => errors.push(error.message))
    await page.route(url => ['mc.yandex.ru', 'mc.yandex.com'].includes(url.hostname), route => {
      requests++
      if (!route.request().url().endsWith('/metrika/tag.js')) return route.abort()
      return route.fulfill({
        contentType: 'application/javascript',
        body: 'window.cookieCalls = window.ym.a.slice(); window.ym = (...args) => window.cookieCalls.push(args);',
      })
    })
    await page.goto(base + 'catalog/?sort=price-asc&q=' + encodeURIComponent(privateSearch))
    const trigger = page.getByRole('button', { name: 'Настройки cookie', exact: true })
    await trigger.scrollIntoViewIfNeeded()
    await trigger.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Настройки cookie' })
    await dialog.waitFor()
    for (let step = 0; step < 4; step++) {
      await page.keyboard.press('Tab')
      assert.ok(await dialog.evaluate(el => el.contains(document.activeElement)))
    }
    assert.equal(requests, 0)
    assert.equal(new URL(page.url()).searchParams.has('q'), false)
    await dialog.getByRole('button', { name: 'Отклонить', exact: true }).click()
    await page.reload()
    assert.equal(await page.evaluate(k => localStorage.getItem(k), key), 'rejected')
    assert.equal(requests, 0)
    await trigger.click()
    await dialog.getByRole('button', { name: 'Принять', exact: true }).click()
    await page.waitForFunction(() => window.cookieCalls?.some(call => call[1] === 'hit'))
    const init = await page.evaluate(() => window.cookieCalls.filter(call => call[1] === 'init'))
    assert.equal(requests, 1)
    assert.equal(init.length, 1)
    assert.equal(init[0][0], Number(counter))
    assert.equal(init[0][2].webvisor, true)
    await page.keyboard.press('Escape')
    assert.equal(await trigger.evaluate(el => document.activeElement === el), true)

    const mobileFilters = page.getByRole('button', { name: 'Поиск и фильтры', exact: true })
    if (await mobileFilters.isVisible()) await mobileFilters.click()
    const search = page.getByRole('searchbox')
    await search.fill('A9001')
    await search.press('Enter')
    assert.equal(new URL(page.url()).searchParams.get('q'), 'A9001')
    await search.fill(privateSearch)
    await search.press('Enter')
    await search.blur()
    assert.equal(await search.inputValue(), privateSearch)
    assert.equal(new URL(page.url()).searchParams.has('q'), false)
    assert.equal(new URL(page.url()).searchParams.get('sort'), 'price-asc')
    const searches = await page.evaluate(() => window.cookieCalls.filter(call => call[2] === 'catalog_search'))
    assert.equal(searches.length, 2)
    assert.doesNotMatch(JSON.stringify(searches), /person|example\.invalid/)

    await page.goto(base + 'catalog/tkan/a9001/')
    await page.waitForFunction(() => window.dataLayer?.some(event => event.ecommerce?.detail))
    const detail = await page.evaluate(() => window.dataLayer.filter(event => event.ecommerce?.detail))
    assert.equal(detail.length, 1)
    assert.equal(detail[0].ecommerce.detail.products.length, 1)
    assert.equal(typeof detail[0].ecommerce.detail.products[0].price, 'number')
    assert.equal(requests, 2)
    const openLead = page.locator('a[aria-haspopup="dialog"][href^="https://t.me/"]').first()
    await openLead.click()
    const closeLead = page.getByRole('button', { name: 'Закрыть заявку' })
    await closeLead.waitFor()
    const fakeTransitions = await page.evaluate(() => window.cookieCalls.filter(call =>
      call[1] === 'extLink' || ['telegram_click', 'external_click'].includes(call[2])))
    assert.equal(fakeTransitions.length, 0)
    await closeLead.click()
    await trigger.click()
    await Promise.all([
      page.waitForEvent('load'),
      dialog.getByRole('button', { name: 'Отклонить', exact: true }).click(),
    ])
    assert.equal(requests, 2)
    assert.equal(await page.evaluate(() => typeof window.ym), 'undefined')
    assert.deepEqual(errors, [])
    console.log(width + 'px: consent, keyboard, catalog privacy, ecommerce detail and withdrawal')
    await page.close()
  }
} finally {
  await browser?.close()
  await server.close()
}
