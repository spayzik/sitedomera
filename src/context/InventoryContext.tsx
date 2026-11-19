import { useEffect, useState, type ReactNode } from 'react'
import { products } from '../data/products'
import { parseInventory } from '../lib/inventory'
import { InventoryContext, initialInventoryState, type StockState } from './inventoryState'

const REFRESH_MS = 2 * 60_000
const snapshotUrl = import.meta.env.BASE_URL + 'generated/inventory.json'

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialInventoryState)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (import.meta.env.VITE_DEKORAY_INVENTORY !== '1') return
    const lifetime = new AbortController()
    let activeRequest: AbortController | undefined
    async function refresh() {
      if (activeRequest || document.hidden) return
      const request = new AbortController()
      activeRequest = request
      const timeout = window.setTimeout(() => request.abort(), 10_000)
      let unavailable: StockState['unavailable'] = 'api_unavailable'
      try {
        const response = await fetch(snapshotUrl, {
          cache: 'no-store', credentials: 'same-origin', redirect: 'error',
          signal: request.signal,
        })
        if (!response.ok) throw new Error('Inventory unavailable')
        unavailable = 'invalid_data'
        const inventory = parseInventory(await response.json(), products)
        if (!lifetime.signal.aborted) {
          setState(previous => previous.inventory && previous.inventory.updatedAt > inventory.updatedAt
            ? previous : { inventory, unavailable: 'api_unavailable' })
        }
      } catch {
        if (!lifetime.signal.aborted) setState(previous => previous.inventory ? previous : { inventory: null, unavailable })
      } finally {
        window.clearTimeout(timeout)
        activeRequest = undefined
      }
    }
    void refresh()
    const interval = window.setInterval(refresh, REFRESH_MS)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      lifetime.abort()
      activeRequest?.abort()
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  const expiresAt = state.inventory?.expiresAt
  useEffect(() => {
    if (!expiresAt) return
    const check = () => setExpired(Date.now() >= expiresAt)
    check()
    const expiry = window.setTimeout(check, Math.max(0, expiresAt - Date.now()))
    document.addEventListener('visibilitychange', check)
    return () => {
      window.clearTimeout(expiry)
      document.removeEventListener('visibilitychange', check)
    }
  }, [expiresAt])

  // Expiry changes the context even when a refresh cannot reach the server.
  const value = expired && expiresAt && Date.now() >= expiresAt ? { ...state } : state
  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>
}
