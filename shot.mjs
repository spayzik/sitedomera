import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--no-sandbox'] })
const p = await browser.newPage()
await p.setViewport({ width: 1920, height: 900, deviceScaleFactor: 1 })
await p.goto('https://spayzik.github.io/sitedomera/', { waitUntil: 'domcontentloaded', timeout: 45000 })
await new Promise(r => setTimeout(r, 3000))
const box = await p.evaluate(() => {
  const h = document.querySelector('.site-header').getBoundingClientRect()
  const inner = document.querySelector('.header-inner').getBoundingClientRect()
  return { x: h.x, y: h.y, w: h.width, h: h.height, ix: inner.x, iw: inner.width }
})
console.log(JSON.stringify(box))
await p.screenshot({ path: 'header-now.png', clip: { x: Math.max(0, box.x - 20), y: Math.max(0, box.y - 20), width: Math.min(box.w + 40, 1920), height: Math.min(box.h + 40, 900) } })
await browser.close()