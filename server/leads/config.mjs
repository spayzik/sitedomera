import { readFileSync } from 'node:fs'
import { isAbsolute } from 'node:path'
import { products } from '../../src/data/products.ts'
import { UUID, VERSION, DOCUMENT_PATH, plainObject } from './validation.mjs'

export function loadConfig(env = process.env, storefront = products) {
  function required(name, valid) {
    const value = env[name]?.trim()
    if (!value || !valid(value)) throw new Error('invalid configuration: ' + name)
    return value
  }
  const origin = required('DEKORAY_SITE_ORIGIN', input => {
    try {
      const url = new URL(input)
      return url.origin === input && url.protocol === 'https:'
    } catch { return false }
  })
  const file = required('DEKORAY_CATALOG_MAP_FILE', isAbsolute)
  let mapping
  try { mapping = JSON.parse(readFileSync(file, 'utf8')) }
  catch { throw new Error('invalid configuration: DEKORAY_CATALOG_MAP_FILE') }
  if (!plainObject(mapping)) throw new Error('invalid configuration: DEKORAY_CATALOG_MAP_FILE')
  const catalog = new Map()
  const mapped = new Set()
  for (const product of storefront) {
    const item = mapping[product.id]
    if (!plainObject(item) || !['product', 'variant', 'bundle'].includes(item.type) ||
        typeof item.id !== 'string' || !UUID.test(item.id) || !Number.isSafeInteger(item.priceMinor) ||
        item.priceMinor <= 0 || item.priceMinor > 100_000_000 || mapped.has(item.id)) {
      throw new Error('missing or invalid storefront mapping: ' + product.id)
    }
    catalog.set(product.id, { type: item.type, id: item.id, priceMinor: item.priceMinor })
    mapped.add(item.id)
  }

  return {
    origin,
    catalog,
    token: required('MOYSKLAD_API_TOKEN', value => /^[!-~]{20,300}$/.test(value)),
    organizationId: required('MOYSKLAD_ORGANIZATION_ID', value => UUID.test(value)),
    intakeStateId: required('MOYSKLAD_INTAKE_STATE_ID', value => UUID.test(value)),
    consentVersion: required('DEKORAY_CONSENT_VERSION', value => VERSION.test(value)),
    consentPath: required('DEKORAY_CONSENT_PATH', value => DOCUMENT_PATH.test(value)),
    ledgerPath: required('DEKORAY_LEAD_LEDGER_PATH', isAbsolute),
    retentionDays: Number(required('DEKORAY_LEAD_LEDGER_DAYS', value => /^(?:[1-9]\d?|[12]\d{2}|3[0-5]\d|36[0-5])$/.test(value))),
    hashKey: required('DEKORAY_LEAD_HMAC_KEY', value => /^[a-f0-9]{64}$/i.test(value)),
    trustLocalProxy: env.DEKORAY_TRUST_LOCAL_PROXY === '1',
  }
}
