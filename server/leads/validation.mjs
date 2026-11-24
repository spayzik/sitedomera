import { leadContextLimit } from '../../src/lib/leadIntents.ts'

export const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i
export const VERSION = /^[a-z0-9][a-z0-9._-]{0,63}$/i
export const DOCUMENT_PATH = /^\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.html$/i
export const MAX_BODY_BYTES = 16 * 1024
export const LEGACY_LEAD_INTENTS = ['consultation', 'selection', 'calculation', 'samples']
const unsupportedControls = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u

export class LeadError extends Error {
  constructor(status, code) {
    super(code)
    this.status = status
    this.code = code
  }
}

export function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasOnlyFields(value, fields) {
  return plainObject(value) && Object.keys(value).every(key => fields.includes(key))
}

export function normalizePhone(value) {
  if (typeof value !== 'string' || value.length > 32 || !/^\+?[0-9 ()-]+$/.test(value.trim())) return null
  const digits = value.replace(/\D/g, '')
  if (value.trim().startsWith('+')) return /^[1-9]\d{9,14}$/.test(digits) ? `+${digits}` : null
  if (digits.length === 10) return `+7${digits}`
  return /^[78]\d{10}$/.test(digits) ? `+7${digits.slice(1)}` : null
}

export function validateLead(raw, config) {
  const common = ['name', 'phone', 'email', 'comment', 'consent', 'website']
  const isInquiry = plainObject(raw) && Object.hasOwn(raw, 'intent')
  if (!hasOnlyFields(raw, [...common, ...(isInquiry ? ['intent', 'context'] : ['items'])]) ||
      raw.website !== '' || typeof raw.name !== 'string' || typeof raw.comment !== 'string' ||
      typeof raw.email !== 'string') {
    throw new LeadError(422, 'invalid_request')
  }
  if (isInquiry ? config.enableGeneralLeads !== true || !LEGACY_LEAD_INTENTS.includes(raw.intent) ||
      (raw.context !== undefined && typeof raw.context !== 'string') :
      !Array.isArray(raw.items) || raw.items.length < 1 || raw.items.length > 45) {
    throw new LeadError(422, 'invalid_request')
  }
  if (!hasOnlyFields(raw.consent, ['accepted', 'version']) || raw.consent.accepted !== true ||
      raw.consent.version !== config.consentVersion) throw new LeadError(422, 'consent_required')

  const name = raw.name.trim().normalize('NFC')
  const phone = normalizePhone(raw.phone)
  const email = raw.email.trim().toLowerCase()
  const comment = raw.comment.trim().normalize('NFC')
  if (name.length < 2 || name.length > 80 || !/^[\p{L}\p{M} .’'-]+$/u.test(name) || !/\p{L}.*\p{L}/u.test(name) || !phone ||
      email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
      comment.length > 1000 || unsupportedControls.test(comment)) {
    throw new LeadError(422, 'invalid_contact')
  }

  const details = { name, phone, email, comment, version: config.consentVersion }
  if (isInquiry) {
    const context = (raw.context ?? '').trim().normalize('NFC')
    if (context.length > leadContextLimit || unsupportedControls.test(context)) {
      throw new LeadError(422, 'invalid_context')
    }
    return { ...details, items: [], intent: raw.intent, context }
  }

  const seen = new Set()
  const items = raw.items.map(item => {
    if (!hasOnlyFields(item, ['id', 'qty']) || typeof item.id !== 'string' || seen.has(item.id) ||
        !Number.isSafeInteger(item.qty) || item.qty < 1 || item.qty > 9999 || !config.catalog.has(item.id)) {
      throw new LeadError(422, 'invalid_items')
    }
    seen.add(item.id)
    return { id: item.id, qty: item.qty }
  }).sort((a, b) => a.id.localeCompare(b.id, 'en'))

  return { name, phone, email, comment, items, version: config.consentVersion }
}
