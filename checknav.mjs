import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--no-sandbox'] })
for (const w of [1920, 1536, 1440, 1366, 1280, 1152, 1100, 1080, 1025, 1024, 768]) {
  const p = await browser.newPage()
  await p.setViewport({ width: w, height: 900 })
  await p.goto('http://localhost:4173/', { waitUntil: 'networkidle0', timeout: 30000 })
  await new Promise(r => setTimeout(r, 1600))
  const r = await p.evaluate(() => {
    const header = document.querySelector('.site-header').getBoundingClientRect()
    const inner = document.querySelector('.header-inner').getBoundingClientRect()
    const nav = document.querySelector('.nav-desktop')
    const navR = nav ? nav.getBoundingClientRect() : null
    const actions = document.querySelector('.header-actions').getBoundingClientRect()
    const toggle = getComputedStyle(document.querySelector('.mobile-toggle')).display
    return {
      headerRight: Math.round(header.right),
      innerRight: Math.round(inner.right),
      navDisplay: nav ? getComputedStyle(nav).display : 'none',
      navRight: navR ? Math.round(navR.right) : null,
      actionsLeft: Math.round(actions.left),
      overflow: inner.right > window.innerWidth ? 'YES' : 'no',
      toggle,
      scrollW: document.documentElement.scrollWidth,
      vw: window.innerWidth,
    }
  })
  console.log(`${w}: ${JSON.stringify(r)}`)
  await p.close()
}
await browser.close()