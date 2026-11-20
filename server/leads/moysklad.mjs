import { LeadError, UUID, plainObject } from './validation.mjs'
import { syncId } from './ledger.mjs'
import { leadIntents } from '../../src/lib/leadIntents.ts'

const base = 'https://api.moysklad.ru/api/remap/1.2/entity'
const requestTimeoutMs = 4000

function entityRef(type, id, path = type) {
  return { meta: { href: base + '/' + path + '/' + id, type, mediaType: 'application/json' } }
}

function validEntity(record, type) {
  return plainObject(record) && typeof record.id === 'string' && UUID.test(record.id) && record.meta?.type === type
}

function temporaryError() {
  return new LeadError(503, 'temporarily_unavailable')
}

export function createMoySklad(config, fetcher = fetch) {
  async function request(path, body) {
    // Paths are fixed API resources plus server-validated UUIDs or URLSearchParams.
    let response
    try {
      response = await fetcher(base + '/' + path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
          Authorization: 'Bearer ' + config.token,
          Accept: 'application/json;charset=utf-8',
          'Accept-Encoding': 'gzip',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json;charset=utf-8' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(requestTimeoutMs),
        redirect: 'error',
      })
    } catch { throw temporaryError() }

    if (!response.ok) {
      await response.body?.cancel().catch(() => {})
      throw new LeadError(503, 'upstream_' + response.status)
    }
    try { return await response.json() }
    catch { throw temporaryError() }
  }

  async function identifyCounterparty(lead) {
    const filter = new URLSearchParams({ filter: 'phone=' + lead.phone, limit: '2' })
    const matches = await request('counterparty?' + filter)
    if (!Array.isArray(matches?.rows)) throw temporaryError()
    // Do not guess which existing customer owns the number if the account has duplicates.
    if (matches.rows.length > 1) throw new LeadError(503, 'counterparty_review_required')
    const existing = matches.rows[0]
    if (existing) {
      if (!validEntity(existing, 'counterparty')) throw temporaryError()
      return existing.id
    }

    const id = syncId(config.hashKey, 'counterparty', lead.phone)
    const created = await request('counterparty', {
      name: lead.name,
      companyType: 'individual',
      phone: lead.phone,
      ...(lead.email ? { email: lead.email } : {}),
      syncId: id,
    })
    if (!validEntity(created, 'counterparty') || created.syncId !== id) throw temporaryError()
    return created.id
  }

  async function createRequest(lead, idempotencyKey, consentAt) {
    const counterpartyId = await identifyCounterparty(lead)
    const positions = lead.items.map(({ id, qty }) => {
      const { type, id: stockId, priceMinor } = config.catalog.get(id)
      return { assortment: entityRef(type, stockId), quantity: qty, price: priceMinor }
    })
    const id = syncId(config.hashKey, 'customerorder', idempotencyKey)
    const order = await request('customerorder', {
      organization: entityRef('organization', config.organizationId),
      agent: entityRef('counterparty', counterpartyId),
      state: entityRef('state', config.intakeStateId, 'customerorder/metadata/states'),
      ...(lead.intent ? {} : { positions }),
      syncId: id,
      applicable: false,
      description: [
        'Запрос с сайта ДЕКОРАЙ. Наличие, цены и условия уточняются менеджером.',
        ...(lead.intent ? ['Тема: ' + leadIntents[lead.intent].subject] : []),
        ...(lead.context ? ['Контекст клиента: ' + lead.context] : []),
        'Имя для связи: ' + lead.name,
        'Телефон: ' + lead.phone,
        ...(lead.email ? ['Email: ' + lead.email] : []),
        ...(lead.comment ? ['Комментарий: ' + lead.comment] : []),
        'Согласие: ' + lead.version + ', ' + new Date(consentAt).toISOString(),
      ].join('\n'),
    })
    if (!validEntity(order, 'customerorder') || order.syncId !== id || order.applicable !== false) {
      throw temporaryError()
    }
    return order.id
  }

  async function preflight() {
    const organization = await request('organization/' + config.organizationId)
    if (!validEntity(organization, 'organization')) throw temporaryError()
    const metadata = await request('customerorder/metadata')
    if (!Array.isArray(metadata?.states) || !metadata.states.some(state => validEntity(state, 'state') && state.id === config.intakeStateId)) {
      throw new LeadError(503, 'intake_state_not_found')
    }
    const seen = new Set()
    // Limit live probe volume; validate the endpoint type and existence, not account contents.
    for (const { id, type } of config.catalog.values()) {
      const entity = await request(type + '/' + id)
      if (!validEntity(entity, type) || entity.archived === true) throw new LeadError(503, 'mapped_product_invalid')
      seen.add(id)
    }
    return { organization: 'visible', intakeState: 'visible', mappedProducts: seen.size }
  }

  async function accessPreflight() {
    // Collection limits minimize retrieved data. Output only resource availability and counts.
    const organizations = await request('organization?limit=1')
    if (!Array.isArray(organizations?.rows)) throw temporaryError()
    const metadata = await request('customerorder/metadata')
    if (!Array.isArray(metadata?.states)) throw temporaryError()
    const assortment = await request('assortment?limit=1')
    if (!Array.isArray(assortment?.rows)) throw temporaryError()
    return {
      organizationVisible: organizations.rows.length > 0,
      intakeStatesVisible: metadata.states.length,
      assortmentVisible: assortment.rows.length > 0,
      writeAccess: 'not_verified',
    }
  }

  return { createRequest, preflight, accessPreflight }
}
