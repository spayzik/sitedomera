import { isLeadIntent, type LeadIntent } from './leadIntents'

const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i
const documentPath = /^\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.html$/i
const consentVersion = /^[a-z0-9][a-z0-9._-]{0,63}$/i

function configuredEndpoint(value: unknown) {
  if (value === '/api/lead') return value
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password &&
      url.pathname === '/api/lead' && !url.search && !url.hash ? url.href : null
  } catch { return null }
}

export const leadEndpoint = configuredEndpoint(import.meta.env.VITE_DEKORAY_LEAD_API)

export type LeadTerms = {
  consentPath: string
  consentVersion: string
  cart: boolean
  intents: readonly LeadIntent[]
}
export type LeadReceipt = { requestId: string }
export type LeadAttempt = { body: string; key: string; receipt?: LeadReceipt }

const safeOptions: RequestInit = { credentials: 'omit', redirect: 'error', cache: 'no-store' }
const jsonType = (response: Response) => /^application\/json\b/i.test(response.headers.get('Content-Type') ?? '')

export async function fetchLeadTerms(endpoint: string, controller: AbortController): Promise<LeadTerms | null> {
  const options = { ...safeOptions, signal: controller.signal }
  const timer = window.setTimeout(() => controller.abort(), 4500)
  try {
    const response = await fetch(endpoint, options)
    if (!response.ok || !jsonType(response)) return null
    const json = await response.json()
    if (json?.status !== 'ready' || typeof json.consentPath !== 'string' || !documentPath.test(json.consentPath) ||
        typeof json.consentVersion !== 'string' || !consentVersion.test(json.consentVersion)) return null
    const policy = await fetch(json.consentPath, options)
    if (!policy.ok || !/^text\/html\b/i.test(policy.headers.get('Content-Type') ?? '')) return null
    const page = new DOMParser().parseFromString(await policy.text(), 'text/html')
    const versions = page.querySelectorAll('meta[name="dekoray-consent-version"]')
    if (versions.length !== 1 || versions[0].getAttribute('content') !== json.consentVersion) return null
    return {
      consentPath: json.consentPath,
      consentVersion: json.consentVersion,
      cart: json.cart === undefined || json.cart === true,
      intents: Array.isArray(json.intents) ? json.intents.filter(isLeadIntent) : [],
    }
  } catch {
    return null
  } finally {
    window.clearTimeout(timer)
  }
}

export async function postLead(endpoint: string, attempt: LeadAttempt, controller: AbortController) {
  const timer = window.setTimeout(() => controller.abort(), 18_000)
  try {
    const response = await fetch(endpoint, {
      ...safeOptions, method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': attempt.key },
      body: attempt.body,
    })
    const json = jsonType(response) ? await response.json() : null
    const valid = [200, 201].includes(response.status) && json?.status === 'accepted' &&
      typeof json.requestId === 'string' && uuid.test(json.requestId)
    return {
      status: response.status,
      error: typeof json?.error === 'string' ? json.error : '',
      receipt: valid ? { requestId: json.requestId as string } : null,
    }
  } finally {
    window.clearTimeout(timer)
  }
}
