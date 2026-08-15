import type { CartItem } from '../context/CartContext'

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

export async function sendLead(data: LeadPayload): Promise<{ ok: boolean; fallback?: string }> {
  const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN as string | undefined
  const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID as string | undefined
  const text = formatMessage(data)

  if (token && chatId) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
        }),
      })
      if (res.ok) return { ok: true }
    } catch {
      /* fall through */
    }
  }

  // Fallback: открыть профиль менеджера в Telegram
  const tg = 'https://t.me/nikita_girsh'
  return { ok: false, fallback: tg }
}
