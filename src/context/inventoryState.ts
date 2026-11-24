import { createContext, useContext } from 'react'
import { availabilityFor, offerAvailability, type CommerceAvailability, type Inventory } from '../lib/inventory'

export type StockState = {
  inventory: Inventory | null
  unavailable: 'api_unavailable' | 'invalid_data'
  commerce: CommerceAvailability | null
}

export const initialInventoryState: StockState = { inventory: null, unavailable: 'api_unavailable', commerce: null }
export const InventoryContext = createContext(initialInventoryState)

export function useStockAvailability(productId: string) {
  const { inventory, unavailable } = useContext(InventoryContext)
  return availabilityFor(inventory, productId, Date.now(), unavailable)
}

export function useOfferAvailability(productId: string) {
  const { inventory, unavailable, commerce } = useContext(InventoryContext)
  return offerAvailability(availabilityFor(inventory, productId, Date.now(), unavailable), productId, commerce)
}
