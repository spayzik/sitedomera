import { useEffect, useState } from 'react'

export const pageRoutes = ['/catalog', '/privacy', '/offer'] as const

function parseHash(hash: string): string {
  return hash.replace(/^#/, '') || '/'
}

export function useRoute(): string {
  const [route, setRoute] = useState<string>(() => parseHash(window.location.hash))
  useEffect(() => {
    const onHash = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Сообщаем Метрике о виртуальных переходах (hashchange не считается просмотром сам по себе)
  useEffect(() => {
    const ym = (window as unknown as { ym?: (...args: unknown[]) => void; __ymId?: number }).ym
    const id = (window as unknown as { __ymId?: number }).__ymId
    if (typeof ym === 'function' && id) {
      ym(id, 'hit', window.location.href)
    }
  }, [route])

  return route
}

export function isPageRoute(route: string): boolean {
  return (pageRoutes as readonly string[]).includes(route)
}