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

  return route
}

export function isPageRoute(route: string): boolean {
  return (pageRoutes as readonly string[]).includes(route)
}
