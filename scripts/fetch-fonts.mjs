// Скачивает шрифты с Google Fonts (woff2, latin+cyrillic) и генерирует public/fonts/fonts.css
// Запуск: node scripts/fetch-fonts.mjs
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const CSS_URL =
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Cormorant:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Unbounded:wght@300;400;500;600&display=swap'
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
const KEEP_SUBSETS = new Set(['latin', 'cyrillic'])
const OUT_DIR = join(process.cwd(), 'public', 'fonts')

const css = await (await fetch(CSS_URL, { headers: { 'User-Agent': UA } })).text()

// Разбиваем на блоки вида: /* subset */ @font-face { ... }
const blocks = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]+\})/g)]
const kept = blocks.map((m) => ({ subset: m[1], rule: m[2] })).filter((b) => KEEP_SUBSETS.has(b.subset))

if (!kept.length) {
  console.error('Не удалось распарсить CSS Google Fonts')
  process.exit(1)
}

await mkdir(OUT_DIR, { recursive: true })

let index = 0
const outRules = []
for (const { rule } of kept) {
  const urlMatch = rule.match(/url\((https:[^)]+\.woff2)\)/)
  if (!urlMatch) continue
  const url = urlMatch[1]
  const family = (rule.match(/font-family:\s*'([^']+)'/) || [])[1] || 'font'
  const weight = (rule.match(/font-weight:\s*(\d+)/) || [])[1] || '400'
  const style = (rule.match(/font-style:\s*(\w+)/) || [])[1] || 'normal'
  const fname = `${family.toLowerCase().replace(/\s+/g, '-')}-${weight}${style === 'italic' ? '-italic' : ''}-${index++}.woff2`
  const buf = Buffer.from(await (await fetch(url, { headers: { 'User-Agent': UA } })).arrayBuffer())
  await writeFile(join(OUT_DIR, fname), buf)
  outRules.push(rule.replace(urlMatch[1], `./${fname}`))
  console.log(`${fname}  ${(buf.length / 1024).toFixed(1)} KB`)
}

await writeFile(
  join(OUT_DIR, 'fonts.css'),
  `/* Self-hosted: Inter, Cormorant, Unbounded (latin + cyrillic). Сгенерировано scripts/fetch-fonts.mjs */\n\n${outRules.join('\n\n')}\n`,
)
console.log(`\nГотово: ${outRules.length} @font-face в public/fonts/fonts.css`)
