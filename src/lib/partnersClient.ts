import type { PartnerProgram } from '../data/partnerPrograms'

export type PartnerItem = { id: string; quantity: number }
type PartnerUser = { id: string; email: string; role: 'partner' | 'manager' | 'admin' }
type PartnerRecord = { id: string; status: string; createdAt: number }
export type PartnerProfile = Pick<PartnerRecord, 'id' | 'status'> & { name: string; email: string; program: PartnerProgram; code: string }
type Project = { id: string; name: string; area: number | null; items: PartnerItem[]; createdAt: number }
type Request = PartnerRecord & { program: PartnerProgram; name: string; details: string; items: PartnerItem[]; partnerId?: string; returnCase?: string | null }
type Referral = PartnerRecord & { partnerId?: string; code?: string; details?: string; clientEmail?: string }
type Order = PartnerRecord & { referralId?: string | null; requestId?: string | null; partnerId?: string }
type FinanceEntry = {
  id: string
  order_id?: string
  partner_id?: string
  status?: string
  reference?: string
  currency?: string
  amount_minor?: number
  earned_minor?: number
  outstanding_minor?: number
  accrued_minor?: number
  payable_minor?: number
  adjustment_minor?: number
  balance_minor?: number
  eligible_minor?: number
  paid_minor?: number
  delta_minor?: number
  available_at?: number
  policy_version?: string
  accrual_id?: string
  created_at?: number
}
type Finance = { accruals: FinanceEntry[]; adjustments: FinanceEntry[]; payouts: FinanceEntry[] }
export type PartnerAccount = Finance & {
  profile: PartnerProfile
  conditions: { version: string; text: string; level?: string; effectiveAt: number } | null
  projects: Project[]
  requests: Request[]
  referrals: Referral[]
  orders: Order[]
  documents: { id: string; title: string; format: 'text' | 'csv'; content: string; createdAt: number }[]
}
export type PartnerManager = Finance & {
  partners: PartnerProfile[]
  applications: (PartnerRecord & { name: string; email: string; program: PartnerProgram; details: string; partnerId?: string })[]
  requests: Request[]
  referrals: Referral[]
  orders: Order[]
}
export type PartnerSession = {
  available: true
  user: PartnerUser | null
  csrf: string
  consentPath: string
  consentVersion?: string
  account?: PartnerAccount
  manager?: PartnerManager
}
type Receipt = { id?: string; status?: string; duplicate?: boolean }
type PartnerCommand = { action: string } & Record<string, unknown>

export const partnerPreview = import.meta.env.VITE_DEKORAY_PREVIEW === '1'
const endpoint = '/api/partners'
const codeKey = 'dekoray-partner-ref'
const codePattern = /^[A-Za-z0-9][A-Za-z0-9_-]{3,31}$/

export function readPartnerCode(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const incoming = new URL(window.location.href).searchParams.get('ref')
  try {
    if (incoming && codePattern.test(incoming)) {
      sessionStorage.setItem(codeKey, incoming)
      return incoming
    }
    const saved = sessionStorage.getItem(codeKey)
    return saved && codePattern.test(saved) ? saved : undefined
  } catch {
    return incoming && codePattern.test(incoming) ? incoming : undefined
  }
}

class PartnerApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, status: number) {
    super(code)
    this.code = code
    this.status = status
  }
}

async function request<T>(init: RequestInit): Promise<{ value: T; status: number }> {
  if (partnerPreview) throw new PartnerApiError('partners_unavailable', 503)
  const response = await fetch(endpoint, { credentials: 'same-origin', cache: 'no-store', redirect: 'error', ...init })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data || typeof data !== 'object') {
    throw new PartnerApiError(typeof data?.error === 'string' ? data.error : 'unavailable', response.status)
  }
  return { value: data as T, status: response.status }
}

export async function loadPartnerSession(signal?: AbortSignal): Promise<PartnerSession> {
  const { value } = await request<PartnerSession>({ method: 'GET', signal })
  if (value.available !== true || typeof value.csrf !== 'string' || value.csrf.length === 0) {
    throw new PartnerApiError('unavailable', 503)
  }
  if (!/^\/(?:[a-z0-9_-]+\/)*(?:[a-z0-9_-]+\.html)?$/i.test(value.consentPath)) value.consentPath = '/privacy/'
  return value
}

export async function sendPartnerCommand<T = Receipt>(csrf: string, body: PartnerCommand) {
  return request<T>({
    method: 'POST', body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', 'X-Partner-CSRF': csrf },
  })
}

const errors: Record<string, string> = {
  invalid_request: 'Проверьте заполнение полей и количество материалов.',
  consent_required: 'Подтвердите согласие на обработку данных.',
  identity_required: 'Подтвердите, что данные клиента сверены с заказом.',
  conflict: 'Запись уже обработана или связана с другой заявкой. Обновите страницу и проверьте её статус.',
  not_found: 'Запись не найдена. Проверьте номер.',
  authentication_required: 'Сессия закончилась. Войдите снова.',
  csrf_invalid: 'Сессия изменилась. Обновите страницу и повторите действие.',
  invalid_credentials: 'Проверьте электронную почту и пароль.',
  forbidden: 'У вашей учётной записи нет доступа к этому действию.',
  rate_limited: 'Слишком много запросов. Повторите попытку позже.',
  attribution_unavailable: 'Регистрация по коду пока недоступна. Свяжитесь с менеджером.',
  orders_unavailable: 'Связь с заказами сейчас недоступна.',
  partners_unavailable: 'Партнёрский сервис пока недоступен.',
}

export function partnerError(error: unknown) {
  return error instanceof PartnerApiError && errors[error.code]
    ? errors[error.code] : 'Не удалось получить ответ. Проверьте соединение и повторите попытку.'
}
