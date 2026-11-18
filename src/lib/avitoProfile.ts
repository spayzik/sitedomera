function configuredAvitoProfile(value?: string): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' && ['avito.ru', 'www.avito.ru'].includes(url.hostname)
      && !url.username && !url.password && !url.port && url.pathname.length > 1) return url.href
  } catch { /* The profile is optional. */ }
  return null
}

const dekorayAvitoProfile = 'https://www.avito.ru/brands/i344978249/all/predlozheniya_uslug?sellerId=fd45c737d9b0e899f5df5a2f4e1a721a'

export const avitoProfile = configuredAvitoProfile(import.meta.env.VITE_AVITO_PROFILE_URL)
  ?? dekorayAvitoProfile
