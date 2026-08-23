import { useEffect, useState } from 'react'

export const pageRoutes = ['/catalog', '/privacy', '/offer'] as const

export function parseHashRoute(hash: string): { path: string; params: URLSearchParams } {
  const raw = hash.replace(/^#/, '')
  const [pathPart, queryPart] = raw.split('?')
  return { path: pathPart || '/', params: new URLSearchParams(queryPart ?? '') }
}

function currentPath(): string {
  return parseHashRoute(window.location.hash).path
}

export function useRoute(): string {
  const [route, setRoute] = useState<string>(currentPath)
  useEffect(() => {
    const onHash = () => setRoute(currentPath())
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
