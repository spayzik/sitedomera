import { loadConfig } from './config.mjs'
import { createLeadServer } from './http.mjs'
import { createLedger } from './ledger.mjs'
import { createMoySklad } from './moysklad.mjs'
import { LeadError } from './validation.mjs'

process.umask(0o077)

try {
  const mode = process.argv[2]
  if (mode === 'access-preflight') {
    const token = process.env.MOYSKLAD_API_TOKEN?.trim()
    if (!token || !/^[!-~]{20,300}$/.test(token)) throw new Error('missing API token')
    const verified = await createMoySklad({ token }).accessPreflight()
    console.info('[dekoray-leads] read_only_access_ok', JSON.stringify(verified))
  } else if (mode === 'preflight') {
    const verified = await createMoySklad(loadConfig()).preflight()
    console.info('[dekoray-leads] read_only_preflight_ok', JSON.stringify(verified))
  } else {
    if (mode || process.env.DEKORAY_ENABLE_LEADS !== '1') {
    throw new Error('lead intake has not been enabled')
    }
    const config = loadConfig()
    const moysklad = createMoySklad(config)
    const port = Number(process.env.DEKORAY_LEAD_PORT ?? 8787)
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('invalid DEKORAY_LEAD_PORT')
    const ledger = createLedger(config.ledgerPath, config.hashKey, config.retentionDays)
    const log = code => console.info('[dekoray-leads]', code)
    const server = createLeadServer({ config, ledger, moysklad, log })
    server.on('error', () => {
      console.error('[dekoray-leads] listener_failed')
      process.exitCode = 1
    })
    server.listen(port, '127.0.0.1', () => log('listening'))
    for (const signal of ['SIGINT', 'SIGTERM']) {
      process.on(signal, () => server.close(() => ledger.close()))
    }
  }
} catch (error) {
  if (error instanceof LeadError) {
    console.error('[dekoray-leads] preflight_failed', error.code)
  } else {
    console.error('[dekoray-leads] invalid_configuration_or_startup_failed')
  }
  process.exitCode = 1
}
