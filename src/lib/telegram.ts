import type { CartItem } from '../context/CartContext'
import { CONTACTS } from '../data/products'

export interface LeadPayload {
  name: string
  phone: string
  message?: string
  type: 'contact' | 'showroom' | 'order'
  cart?: CartItem[]
  productName?: string
}

function formatMessage(data: LeadPayload) {
  const lines = [
    `🏠 <b>Домэра — новая заявка</b>`,
    `Тип: <b>${data.type}</b>`,
    `Имя: ${escapeHtml(data.name)}`,
    `Телефон: ${escapeHtml(data.phone)}`,
  ]
  if (data.productName) lines.push(`Панель: ${escapeHtml(data.productName)}`)
  if (data.message) lines.push(`Сообщение: ${escapeHtml(data.message)}`)
  if (data.cart?.length) {
    lines.push('', '<b>Корзина:</b>')
    data.cart.forEach((i) => {
      lines.push(
        `• ${i.product.name} (${i.product.sku}) × ${i.qty} = ${(i.qty * i.product.price).toLocaleString('ru-RU')} ₽`,
      )
    })
    const total = data.cart.reduce((s, i) => s + i.qty * i.product.price, 0)
    lines.push(`<b>Итого: ${total.toLocaleString('ru-RU')} ₽</b>`)
  }
  return lines.join('\n')
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export interface LeadResult {
  ok: boolean
  /** Ссылка на Telegram, если автосообщение не ушло */
  tg?: string
  /** Телефон для связи, если автосообщение не ушло */
  tel?: string
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function postJson(url: string, body: unknown): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function sendLead(data: LeadPayload): Promise<LeadResult> {
  const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN as string | undefined
  const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID as string | undefined
  const fallbackUrl = import.meta.env.VITE_LEAD_FALLBACK_URL as string | undefined
  const text = formatMessage(data)
  const tg = CONTACTS.telegram
  const tel = CONTACTS.phoneRaw

  if (token && chatId) {
    // Две попытки: мгновенная и повтор через секунду (мигания сети / rate limit)
    for (let attempt = 0; attempt < 2; attempt++) {
      const sent = await postJson(
        `https://api.telegram.org/bot${token}/sendMessage`,
        { chat_id: chatId, text, parse_mode: 'HTML' },
      )
      if (sent) return { ok: true }
      if (attempt === 0) await sleep(1000)
    }
  }

  // Fallback 1: резервный эндпоинт (email/CRM), если настроен
  if (fallbackUrl && (await postJson(fallbackUrl, data))) {
    return { ok: true }
  }

  // Fallback 2: живой человек — телефон и Telegram
  return { ok: false, tg, tel }
}
