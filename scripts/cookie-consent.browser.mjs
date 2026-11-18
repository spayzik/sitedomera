import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { mkdir } from 'node:fs/promises'

// Run against a production preview built with VITE_YM_ID=114347066.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href : 'playwright')
const base = 'http://127.0.0.1:43920/'
const evidence = process.env.COOKIE_SCREENSHOTS
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXE })
const counter = '**://mc.yandex.ru/**'
const key = 'domera-analytics-consent-v1'
const banner = '[aria-labelledby="cookie-banner-title"]'

try {
  if (evidence) await mkdir(evidence, { recursive: true })
  for (const [width, height] of [[360, 800], [390, 844], [768, 1024], [1440, 900], [740, 375]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' })
    let requests = 0
    const faults = []
    page.on('pageerror', error => faults.push(error.message))
    await page.route(counter, route => {
      requests++
      return route.fulfill({ contentType: 'application/javascript', body:
        'window.cookieCalls = window.ym.a.slice(); window.ym = (...args) => window.cookieCalls.push(args);' })
    })
    await page.goto(base)
    await page.locator('.preloader').waitFor({ state: 'hidden' })
    const panel = page.locator(banner)
    assert.equal(await panel.count(), 0, 'cookie card must leave the hero unobstructed')
    await page.locator('#top').evaluate(el => window.scrollBy(0, el.getBoundingClientRect().bottom + 20))
    await panel.waitFor()
    await page.evaluate(() => window.scrollTo(0, 0))
    await panel.waitFor({ state: 'hidden' })
    await page.locator('#top').evaluate(el => window.scrollBy(0, el.getBoundingClientRect().bottom + 20))
    await panel.waitFor()
    assert.equal(requests, 0)
    const box = await panel.boundingBox()
    assert.ok(box.x >= 0 && box.x + box.width <= width && box.y + box.height <= height + 1)
    assert.equal(await panel.evaluate(el => getComputedStyle(el).animationName), 'none')
    for (const button of await panel.getByRole('button').all()) assert.ok((await button.boundingBox()).height >= 44)
    if (evidence && [390, 1440].includes(width)) await page.screenshot({ path: resolve(evidence, 'banner-' + width + '.png') })
    await panel.getByRole('button', { name: 'Отклонить', exact: true }).click()
    assert.equal(await page.evaluate(k => localStorage.getItem(k), key), 'rejected')
    await page.reload()
    assert.equal(await page.locator(banner).count(), 0)
    assert.equal(requests, 0)
    await page.goto(base + '#/catalog')
    await page.getByRole('button', { name: 'Добавить в подборку' }).first().click()
    const cart = page.getByRole('dialog', { name: 'Ваша подборка' })
    await cart.waitFor()
    await page.keyboard.press('Escape')
    await cart.waitFor({ state: 'hidden' })

    const trigger = page.getByRole('button', { name: 'Настройки cookie', exact: true })
    await trigger.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Настройки cookie' })
    await dialog.waitFor()
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab')
      assert.ok(await dialog.evaluate(el => el.contains(document.activeElement)))
    }
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden' })
    assert.equal(await trigger.evaluate(el => document.activeElement === el), true)
    await trigger.click()
    if (evidence && width === 390) await page.screenshot({ path: resolve(evidence, 'settings-390.png') })
    await dialog.getByRole('button', { name: 'Принять', exact: true }).click()
    await page.waitForFunction(() => window.cookieCalls?.some(call => call[1] === 'hit'))
    assert.equal(await page.evaluate(k => localStorage.getItem(k), key), 'accepted')
    await page.keyboard.press('Escape')
    await page.goto(base + '#/offer')
    await page.goto(base + '#/offer?ref=synthetic')
    await page.waitForFunction(() => window.cookieCalls?.filter(call => call[1] === 'hit').length === 2)
    const calls = await page.evaluate(() => window.cookieCalls)
    assert.equal(requests, 1)
    const init = calls.filter(call => call[1] === 'init')
    assert.equal(init.length, 1)
    assert.equal(init[0][0], 114347066)
    assert.equal(init[0][2].defer, true)
    assert.equal(init[0][2].webvisor, false)
    assert.doesNotMatch(JSON.stringify(calls), /synthetic/)
    await page.reload()
    await page.waitForFunction(() => window.cookieCalls?.some(call => call[1] === 'hit'))
    assert.equal(requests, 2)
    assert.equal(await page.locator(banner).count(), 0)
    await trigger.click()
    await Promise.all([
      page.waitForEvent('load'),
      dialog.getByRole('button', { name: 'Отклонить', exact: true }).click(),
    ])
    assert.equal(await page.evaluate(k => localStorage.getItem(k), key), 'rejected')
    assert.equal(await page.evaluate(() => typeof window.ym), 'undefined')
    assert.equal(requests, 2)
    assert.deepEqual(faults, [])
    console.log(width + '×' + height + ' consent, storage, keyboard dialog, SPA, reload and cart PASS')
    await page.close()
  }

  const page = await browser.newPage()
  let blocked = 0
  const faults = []
  page.on('pageerror', error => faults.push(error.message))
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError') } })
  })
  await page.route(counter, route => { blocked++; return route.abort() })
  await page.goto(base + '#/catalog')
  await page.locator(banner).getByRole('button', { name: 'Принять', exact: true }).click()
  await page.goto(base + '#/catalog')
  await page.getByRole('button', { name: 'Добавить в подборку' }).first().click()
  await page.getByRole('dialog', { name: 'Ваша подборка' }).waitFor()
  assert.equal(blocked, 1)
  assert.deepEqual(faults, [])
  console.log('Unavailable localStorage and failed analytics transport PASS')
} finally {
  await browser.close()
}
