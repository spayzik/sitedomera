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
  return route
}

export function isPageRoute(route: string): boolean {
  return (pageRoutes as readonly string[]).includes(route)
}