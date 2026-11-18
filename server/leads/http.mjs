import { createServer } from 'node:http'
import { isIP } from 'node:net'
import { MAX_BODY_BYTES, UUID, LeadError, validateLead } from './validation.mjs'
import { digest } from './ledger.mjs'

const apiPath = '/api/lead'

async function readBody(request) {
  const length = request.headers['content-length']
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) {
    throw new LeadError(413, 'body_too_large')
  }
  // Keep the socket open long enough to send a bounded error after rejecting a chunked body.
  return await new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    request.on('data', chunk => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        request.pause()
        reject(new LeadError(413, 'body_too_large'))
      } else {
        chunks.push(chunk)
      }
    })
    request.on('end', () => {
      try { resolve(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)))) }
      catch { reject(new LeadError(400, 'invalid_json')) }
    })
    request.on('error', () => reject(new LeadError(400, 'invalid_request')))
  })
}

function clientIp(request, trustLocalProxy) {
  const address = request.socket.remoteAddress || 'unknown'
  if (trustLocalProxy && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)) {
    const forwarded = request.headers['x-dekoray-client-ip']
    if (typeof forwarded === 'string' && isIP(forwarded)) return forwarded
  }
  return address
}

export function createLeadServer({ config, ledger, moysklad, log = () => {} }) {
  return createServer({ requestTimeout: 10_000, headersTimeout: 8000, maxHeaderSize: 8192 }, async (request, response) => {
    const origin = request.headers.origin
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('Vary', 'Origin')
    response.setHeader('X-Content-Type-Options', 'nosniff')

    function reply(status, body) {
      if (status === 413) response.setHeader('Connection', 'close')
      response.writeHead(status)
      response.end(body === undefined ? undefined : JSON.stringify(body))
    }

    let operation
    try {
      if (request.url !== apiPath) return reply(404, { error: 'not_found' })
      if (origin && origin !== config.origin) return reply(403, { error: 'origin_denied' })
      if (origin === config.origin) {
        response.setHeader('Access-Control-Allow-Origin', origin)
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Idempotency-Key')
      }
      if (request.method === 'OPTIONS') {
        return origin === config.origin ? reply(204) : reply(403, { error: 'origin_denied' })
      }
      if (request.method === 'GET') {
        return reply(200, { status: 'ready', consentPath: config.consentPath, consentVersion: config.consentVersion })
      }
      if (request.method !== 'POST') return reply(405, { error: 'method_not_allowed' })
      if (origin !== config.origin) return reply(403, { error: 'origin_denied' })
      if (!/^application\/json(?:\s*;.*)?$/i.test(request.headers['content-type'] ?? '')) {
        return reply(415, { error: 'json_required' })
      }
      ledger.consumeRate(clientIp(request, config.trustLocalProxy))
      const key = request.headers['idempotency-key']
      if (typeof key !== 'string' || !UUID.test(key)) throw new LeadError(400, 'idempotency_key_required')
      const lead = validateLead(await readBody(request), config)
      // Bind the reservation to the effective server-side mapping/status as well as the request.
      const context = {
        organizationId: config.organizationId,
        intakeStateId: config.intakeStateId,
        items: lead.items.map(({ id }) => config.catalog.get(id)),
      }
      const fingerprint = digest(config.hashKey, 'payload', JSON.stringify([lead, context]))
      operation = ledger.reserve(key, fingerprint, config.consentVersion)
      if (operation.inProgress) return reply(409, { error: 'request_in_progress' })
      if (operation.receiptId) return reply(200, { status: 'accepted', requestId: operation.receiptId })

      const requestId = await moysklad.createRequest(lead, operation.key, operation.consentAt)
      ledger.finish(operation, requestId)
      log('accepted')
      return reply(201, { status: 'accepted', requestId })
    } catch (error) {
      if (operation?.lease) {
        try { ledger.release(operation) }
        catch { log('ledger_release_failed') }
      }
      if (error instanceof LeadError && error.status < 500) {
        if (error.status === 429) response.setHeader('Retry-After', '60')
        return reply(error.status, { error: error.code })
      }
      // Only send classifications to sinks. Never include request values, URLs or provider errors.
      log(error instanceof LeadError ? error.code : 'request_failed')
      return reply(503, { error: 'temporarily_unavailable' })
    }
  })
}
