import { CONTACTS } from '../data/products'

function configuredAvitoProfile(value?: string): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' && ['avito.ru', 'www.avito.ru'].includes(url.hostname)
      && !url.username && !url.password && !url.port && url.pathname.length > 1) return url.href
  } catch { /* The profile is optional. */ }
  return null
}

export const avitoProfile = configuredAvitoProfile(import.meta.env.VITE_AVITO_PROFILE_URL)
  ?? CONTACTS.avito
