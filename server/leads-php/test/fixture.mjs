import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { createHash, randomBytes } from 'node:crypto'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

export const id = 'pdf2026-p10-r2c1'
export const organizationId = 'd9edcfd8-bd63-4f87-9a9c-786119447b04'
export const intakeStateId = 'ec5d5794-dbf5-4fbe-a6da-8eedc723105e'
export const mapped = '94898ac4-f516-4755-91e4-07dbd9ebaa9d'
export const receipt = 'a106c786-6007-402c-90a3-20e9c181de7a'
export const sentinel = 'fixture-value-never-logged'
export const intakeAgentId = '7cdd0000-09ac-4500-ada2-f88240c7e22e'
const consent = '<meta name="dekoray-consent-version" content="qa-php-only">'
const previewOrigin = 'https://spayzik.github.io'

export async function fixture({ webroot, staging, localBrowserOrigin } = {}) {
  if (localBrowserOrigin && (!staging || !/^http:\/\/127\.0\.0\.1:[1-9][0-9]{3,4}$/.test(localBrowserOrigin))) {
    throw new Error('Local browser origin must be a loopback staging origin')
  }
  if (staging && (!/^[A-Za-z0-9_-]{32,128}$/.test(staging.access) || !Number.isInteger(staging.port) ||
      staging.port < 0 || staging.port > 65535 || webroot)) throw new Error('Invalid staging fixture configuration')
  const directory = await mkdtemp(join(tmpdir(), 'dekoray-php-lead-'))
  webroot ??= join(directory, 'web')
  const legal = join(webroot, 'legal')
  await mkdir(legal, { recursive: true })
  const consentFile = join(legal, 'lead-consent.html')
  await writeFile(consentFile, consent, { flag: 'wx' })
  const deliveries = staging ? new DatabaseSync(join(directory, 'synthetic-deliveries.sqlite')) : null
  deliveries?.exec('PRAGMA synchronous=FULL; CREATE TABLE deliveries (receipt TEXT PRIMARY KEY, order_json TEXT NOT NULL)')
  const orders = new Map()
  const attempts = []
  let failure = null
  let php
  let logs = ''
  const crm = createServer(async (request, response) => {
    try {
      assert.equal(request.headers.authorization, undefined)
      const url = new URL(request.url, 'http://localhost')
      const path = url.pathname.replace('/api/remap/1.2/entity/', '')
      const send = (status, body) => response.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(body))
      if (request.method === 'GET') {
        if (path === 'counterparty/' + intakeAgentId) return send(200, { id:intakeAgentId, meta:{type:'counterparty'} })
        if (path === 'organization') return send(200, { rows: [{ id: organizationId }] })
        if (path === 'customerorder/metadata') return send(200, { states: [{ id: intakeStateId, meta: { type: 'state' } }] })
        if (path === 'assortment') return send(200, { rows: [{ id: mapped }] })
        if (path === 'organization/' + organizationId) return send(200, { id: organizationId, meta: { type: 'organization' } })
        if (path === 'product/' + mapped) return send(200, { id: mapped, meta: { type: 'product' } })
      }
      assert.equal(request.method, 'POST')
      assert.equal(path, 'customerorder')
      assert.equal(url.search, '')
      let raw = ''
      for await (const chunk of request) raw += chunk
      const body = JSON.parse(raw)
      assert.equal(body.applicable, false)
      for (const field of ['reserve', 'payments', 'demands', 'stock']) assert(!Object.hasOwn(body, field))
      for (const position of body.positions ?? []) assert(!Object.hasOwn(position, 'reserve'))
      attempts.push(body)
      const mode = failure
      failure = null
      if (typeof mode === 'number') return send(mode, { message: sentinel })
      if (mode === 'bad-ack') return send(201, { id: receipt, meta: {type:'customerorder'}, syncId: body.syncId, applicable: true })
      const ack = { id: staging ? body.syncId : receipt, meta: {type:'customerorder'}, syncId: body.syncId, applicable: false }
      deliveries?.prepare('INSERT OR IGNORE INTO deliveries VALUES (?, ?)').run(ack.id, JSON.stringify(body))
      orders.set(body.syncId, ack)
      if (mode === 'timeout') return setTimeout(() => send(201, ack), 1400)
      return send(201, ack)
    } catch {
      response.writeHead(500).end()
    }
  })
  crm.listen(0, '127.0.0.1')
  await once(crm, 'listening')
  const portProbe = createServer()
  portProbe.listen(staging?.port ?? 0, '127.0.0.1')
  await once(portProbe, 'listening')
  const port = portProbe.address().port
  await new Promise(resolve => portProbe.close(resolve))
  const origin = 'http://127.0.0.1:' + port
  const config = {
    origin: staging ? (localBrowserOrigin ?? previewOrigin) : origin, organizationId, intakeStateId, intakeAgentId, token: sentinel, enableGeneralLeads: true,
    hashKey: '8'.repeat(64), consentPath: '/legal/lead-consent.html', consentVersion: 'qa-php-only',
    consentSha256: createHash('sha256').update(consent).digest('hex'),
    ledgerPath: join(directory, 'leads.sqlite'), catalog: { [id]: { id: mapped, type: 'product', priceMinor: 800000 } },
  }
  config.catalogFacts = { [id]: { sku:'A9001', unit:'лист', priceMinor:800000, kind:'panel', widthMm:1220, lengthMm:3000 } }
  if (staging) {
    config.testAccess = staging.access
    config.hashKey = randomBytes(32).toString('hex')
    const { products } = await import('../../../src/data/products.ts')
    for (const product of products) {
      const productId = createHash('sha256').update(product.id).digest('hex').replace(
        /^(........)(....)(....)(....)(............).*$/, '$1-$2-$3-$4-$5')
      config.catalog[product.id] = { id:productId, type:'product', priceMinor:product.priceRub * 100 }
      config.catalogFacts[product.id] = {
        sku:product.sku, unit:product.unit, priceMinor:product.priceRub * 100, kind:product.kind,
        widthMm:product.dimensions.widthMm, lengthMm:product.dimensions.lengthMm,
      }
    }
  }
  async function stopPhp() {
    if (!php || php.exitCode !== null || php.signalCode !== null) return
    const exited = once(php, 'exit')
    php.kill()
    await exited
  }
  async function startPhp() {
    const bin = process.env.DEKORAY_PHP_BIN || 'php'
    const args = process.env.DEKORAY_PHP_EXT
      ? ['-n', '-d', 'extension_dir=' + process.env.DEKORAY_PHP_EXT,
        ...['curl', 'intl', 'mbstring', 'pdo_sqlite', 'openssl'].flatMap(extension => ['-d', 'extension=' + extension])]
      : []
    php = spawn(bin, [...args, '-d', 'display_errors=0', '-S', '127.0.0.1:' + port, '-t', webroot,
      fileURLToPath(new URL('./router.php', import.meta.url))], {
      windowsHide: true, env: {
        ...process.env, DEKORAY_FIXTURE_CONFIG: JSON.stringify(config),
        DEKORAY_FIXTURE_CRM: 'http://127.0.0.1:' + crm.address().port,
      },
    })
    let spawnError
    php.on('error', error => { spawnError = error })
    php.stderr.on('data', chunk => { logs += chunk })
    for (let attempt = 0; attempt < 100; attempt++) {
      if (spawnError) throw spawnError
      if (php.exitCode !== null) throw new Error('PHP exited: ' + logs)
      try {
        const response = await fetch(origin + '/api/lead')
        assert.equal(response.status, 200, logs)
        return
      } catch (error) {
        if (error.code === 'ERR_ASSERTION') throw error
      }
      await new Promise(resolve => setTimeout(resolve, 30))
    }
    throw new Error('PHP did not start: ' + logs)
  }
  async function close() {
    await stopPhp()
    await new Promise(resolve => { crm.close(resolve); crm.closeAllConnections() })
    deliveries?.close()
    await rm(consentFile, { force: true })
    await rm(directory, { recursive: true, force: true })
  }
  try { await startPhp() } catch (error) { await close(); throw error }
  return {
    origin, config, orders, attempts,
    sealedDeliveryCount: () => deliveries?.prepare('SELECT count(*) AS count FROM deliveries').get().count ?? 0,
    failNext: mode => { failure = mode },
    retryPending: () => fetch(origin + '/__local_retry', {method:'POST'}),
    restart: async () => { await stopPhp(); await startPhp() },
    logs: () => logs, close,
  }
}
