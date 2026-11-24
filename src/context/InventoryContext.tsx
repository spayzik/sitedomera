import { useEffect, useState, type ReactNode } from 'react'
import { CONTACTS, products } from '../data/products'
import { parseCommerceAvailability, parseInventory, stagingInventoryUrl } from '../lib/inventory'
import { InventoryContext, initialInventoryState, type StockState } from './inventoryState'

const REFRESH_MS = 2 * 60_000
const defaultSnapshotUrl = import.meta.env.BASE_URL + 'generated/inventory.json'

const remotePreviewUrl = import.meta.env.VITE_DEKORAY_PREVIEW === '1'
  ? stagingInventoryUrl(import.meta.env.VITE_DEKORAY_STAGING_STOCK_URL, CONTACTS.hostname)
  : null

export function InventoryProvider({ children, snapshotUrl = defaultSnapshotUrl, commerceUrl }: {
  children: ReactNode; snapshotUrl?: string; commerceUrl?: string
}) {
  const endpoint = remotePreviewUrl ?? snapshotUrl
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
      const commerceRequest = commerceUrl && import.meta.env.VITE_DEKORAY_PREVIEW !== '1' ? fetch(commerceUrl, {
        cache: 'no-store', credentials: 'omit', redirect: 'error', signal: request.signal,
      }).then(async response => response.ok ? parseCommerceAvailability(await response.json(), products) : null).catch(() => null)
        : Promise.resolve(null)
      let unavailable: StockState['unavailable'] = 'api_unavailable'
      try {
        const response = await fetch(endpoint, {
          cache: 'no-store', credentials: remotePreviewUrl ? 'omit' : 'same-origin', redirect: 'error',
          signal: request.signal,
        })
        if (!response.ok) throw new Error('Inventory unavailable')
        unavailable = 'invalid_data'
        const inventory = parseInventory(await response.json(), products)
        if (!lifetime.signal.aborted) {
          setState(previous => previous.inventory && previous.inventory.updatedAt > inventory.updatedAt
            ? previous : { ...previous, inventory, unavailable: 'api_unavailable' })
        }
      } catch {
        if (!lifetime.signal.aborted) setState(previous => previous.inventory ? previous : { ...previous, inventory: null, unavailable })
      } finally {
        const commerce = await commerceRequest
        if (!lifetime.signal.aborted) setState(previous => previous.commerce === commerce ? previous : { ...previous, commerce })
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
  }, [endpoint, commerceUrl])

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
