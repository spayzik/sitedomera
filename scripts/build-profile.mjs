import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { CONTACTS, products } from '../src/data/products.ts'
import { parseInventory, stagingInventoryUrl } from '../src/lib/inventory.ts'
import { assertPublicAvitoSnapshot } from './public-avito-snapshot.mjs'

const [profile] = process.argv.slice(2)
if (!['staging', 'production'].includes(profile)) {
  throw new Error('Usage: node scripts/build-profile.mjs staging|production')
}

const staging = profile === 'staging'
const env = {
  ...process.env,
  VITE_DEKORAY_PREVIEW: staging ? '1' : '0',
  VITE_DEKORAY_STAGING_PAYMENT_API: staging ? process.env.VITE_DEKORAY_STAGING_PAYMENT_API ?? '' : '',
  VITE_DEKORAY_LEAD_API: staging ? '' : '/api/lead',
  VITE_DEKORAY_STAGING_LEAD_API: staging ? process.env.VITE_DEKORAY_STAGING_LEAD_API ?? '' : '',
  VITE_DEKORAY_STAGING_STOCK_URL: staging ? process.env.VITE_DEKORAY_STAGING_STOCK_URL ?? '' : '',
  VITE_YM_STAGING_ID: staging ? process.env.VITE_YM_STAGING_ID ?? '' : '',
  VITE_YM_ID: staging ? '' : process.env.VITE_YM_ID || '114347066',
  VITE_YM_WEBVISOR: staging ? process.env.VITE_YM_WEBVISOR ?? '0' : '1',
}

if (staging && env.VITE_DEKORAY_STAGING_LEAD_API) {
  const endpoint = new URL(env.VITE_DEKORAY_STAGING_LEAD_API)
  if (endpoint.protocol !== 'https:' || endpoint.pathname !== '/api/lead' ||
      endpoint.username || endpoint.password || endpoint.search || endpoint.hash ||
      /(^|\.)xn--80ahdrdyo\.xn--p1ai$/i.test(endpoint.hostname.replace(/\.$/, ''))) {
    throw new Error('Staging requires a separate HTTPS /api/lead endpoint')
  }
}
if (staging && env.VITE_DEKORAY_STAGING_PAYMENT_API) {
  const endpoint = new URL(env.VITE_DEKORAY_STAGING_PAYMENT_API)
  if (endpoint.protocol !== 'https:' || endpoint.pathname !== '/api/payment' ||
      endpoint.username || endpoint.password || endpoint.search || endpoint.hash ||
      /(^|\.)xn--80ahdrdyo\.xn--p1ai$/i.test(endpoint.hostname.replace(/\.$/, ''))) {
    throw new Error('Staging requires a separate HTTPS /api/payment endpoint in test mode')
  }
}
if (staging && env.VITE_YM_STAGING_ID &&
    [process.env.VITE_YM_ID, '114347066'].some(id => Number(id) === Number(env.VITE_YM_STAGING_ID))) {
  throw new Error('Staging cannot use the production analytics counter')
}
const stockUrl = stagingInventoryUrl(env.VITE_DEKORAY_STAGING_STOCK_URL, CONTACTS.hostname)
if (env.VITE_DEKORAY_STAGING_STOCK_URL && !stockUrl) {
  throw new Error('Staging stock requires an isolated HTTPS /generated/inventory.json endpoint')
}
const stockFile = staging ? process.env.DEKORAY_BUILD_STOCK_SNAPSHOT : undefined
const avitoFile = process.env.DEKORAY_BUILD_AVITO_SNAPSHOT
const stock = stockFile ? JSON.parse(readFileSync(stockFile, 'utf8')) : null
const avito = avitoFile ? JSON.parse(readFileSync(avitoFile, 'utf8')) : null
if (stock) parseInventory(stock, products)
if (avito) assertPublicAvitoSnapshot(avito)
env.VITE_DEKORAY_INVENTORY = !staging || stock || stockUrl ? '1' : '0'
if (staging) env.DEKORAY_INDEXNOW_KEY = ''

function runTask(task) {
  const options = { stdio: 'inherit', env }
  const run = process.platform === 'win32'
    ? spawnSync('npm.cmd run ' + task, { ...options, shell: true })
    : spawnSync('npm', ['run', task], options)
  if (run.error) throw run.error
  if (run.status !== 0) process.exit(run.status ?? 1)
}

runTask('build')
if (stock) writeFileSync('dist/generated/inventory.json', JSON.stringify(stock))
if (avito) writeFileSync('dist/generated/avito-reviews.json', JSON.stringify(avito))
runTask('verify:production')
