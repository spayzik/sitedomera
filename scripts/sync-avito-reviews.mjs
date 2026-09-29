import { randomUUID } from 'node:crypto'
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { createAvitoSnapshot, REQUEST_LIMIT } from './avito-reviews-core.mjs'

const output = resolve('public/generated/avito-reviews.json')
const clientId = process.env.AVITO_CLIENT_ID
const clientSecret = process.env.AVITO_CLIENT_SECRET

async function requestJson(url, options, label) {
  let response
  try {
    response = await fetch(url, { ...options, signal: AbortSignal.timeout(15_000) })
  } catch {
    throw new Error(`${label}: network or timeout failure`)
  }
  if (!response.ok) throw new Error(`${label}: HTTP ${response.status}`)
  try {
    return await response.json()
  } catch {
    throw new Error(`${label}: invalid JSON`)
  }
}

async function sync() {
  const tokenData = await requestJson('https://api.avito.ru/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  }, 'Token request')
  if (typeof tokenData?.access_token !== 'string' || !tokenData.access_token) {
    throw new Error('Token response has no access token')
  }
  const headers = { Authorization: `Bearer ${tokenData.access_token}` }
  const info = await requestJson('https://api.avito.ru/ratings/v1/info', { headers }, 'Rating info')
  const reviewsUrl = new URL('https://api.avito.ru/ratings/v1/reviews')
  reviewsUrl.search = new URLSearchParams({ offset: '0', limit: String(REQUEST_LIMIT) }).toString()
  const list = await requestJson(reviewsUrl, { headers }, 'Review list')
  const snapshot = createAvitoSnapshot(info, list)

  await mkdir(dirname(output), { recursive: true })
  const temporary = `${output}.${randomUUID()}.tmp`
  try {
    await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
    await rename(temporary, output)
  } finally {
    await rm(temporary, { force: true })
  }
  console.log(`[avito] Synced ${snapshot.reviews.length} reviews; no credentials or token were written.`)
}

if (!clientId && !clientSecret) {
  console.warn('[avito] Credentials absent; keeping the existing static snapshot.')
} else if (!clientId || !clientSecret) {
  console.error('[avito] Credentials incomplete; keeping the existing static snapshot.')
  process.exitCode = 1
} else {
  try {
    await sync()
  } catch (error) {
    // Request bodies, headers, responses and credentials must never reach CI logs.
    console.error(`[avito] Sync failed: ${error instanceof Error ? error.message : 'unknown error'}. Existing snapshot preserved.`)
    process.exitCode = 1
  }
}
