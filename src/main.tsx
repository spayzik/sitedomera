import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { legacyProductPath } from './lib/catalogNavigation'

const migratedProduct = import.meta.env.PROD ? legacyProductPath(window.location.hash) : null
if (migratedProduct) {
  window.location.replace(import.meta.env.BASE_URL + migratedProduct.slice(1) + window.location.search)
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )
}
