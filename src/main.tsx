import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { legacyProductPath, parseCatalogHash } from './lib/catalogNavigation'
import { categoryPath } from './data/seoPaths'

const root = document.getElementById('root')!
const base = root.dataset.assetBase ?? (import.meta.env.DEV ? '/' : './')
const path = root.dataset.path ?? (import.meta.env.DEV ? window.location.pathname : '/')

function migrateLegacyRoute() {
  if (path !== '/') return false
  const { hash, search } = window.location
  if (hash === '#/privacy') { window.location.replace(base + 'privacy/'); return true }
  if (!/^#\/catalog(?:\?|$)/.test(hash)) return false
  const product = legacyProductPath(hash)
  const { categoryId } = parseCatalogHash(hash)
  const target = product ?? (categoryId === 'all' ? '/catalog/' : categoryPath(categoryId))
  const query = new URLSearchParams(search)
  for (const [key, value] of new URLSearchParams(hash.split('?')[1])) {
    if (key !== 'category' && key !== 'sku') query.set(key, value)
  }
  window.location.replace(base + target.slice(1) + (query.size ? '?' + query : ''))
  return true
}

if (!migrateLegacyRoute()) {
  window.addEventListener('hashchange', migrateLegacyRoute)
  const app = <ErrorBoundary><App base={base} path={path} /></ErrorBoundary>
  if (root.dataset.path) hydrateRoot(root, app)
  else createRoot(root).render(app)
}
