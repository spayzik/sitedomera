import { CONTACTS } from '../data/products'
import { leadContextLimit, leadIntents, type LeadIntent } from './leadIntents'
import { buildTelegramDraftUrl } from './telegramLink'

function verifiedLink(value: string | undefined, hosts: string[], path: RegExp) {
  if (!value) return undefined
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' && hosts.includes(url.hostname) && path.test(url.pathname) &&
        !url.username && !url.password && !url.port && !url.search && !url.hash) return url.href
  } catch { /* A missing or invalid channel stays hidden. */ }
}

export const contactLinks = {
  phone: 'tel:' + CONTACTS.phoneRaw,
  phoneLabel: CONTACTS.phone,
  telegram: CONTACTS.telegram,
  telegramChannel: CONTACTS.telegramChannel,
  whatsapp: verifiedLink(import.meta.env.VITE_DEKORAY_WHATSAPP_URL, ['wa.me'], /^\/[1-9]\d{6,14}\/?$/),
  max: verifiedLink(import.meta.env.VITE_DEKORAY_MAX_URL, ['max.ru'], /^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)?\/?$/),
  instagram: verifiedLink(import.meta.env.VITE_DEKORAY_INSTAGRAM_URL, ['www.instagram.com', 'instagram.com'], /^\/[A-Za-z0-9._]+\/?$/),
}

export function inquiryTelegramLink(intent: LeadIntent, context = '') {
  const message = [leadIntents[intent].message, context.trim().slice(0, leadContextLimit)].filter(Boolean).join('\n\n')
  return buildTelegramDraftUrl(contactLinks.telegram, message)
}
