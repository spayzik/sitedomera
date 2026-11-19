import { createContext, useContext } from 'react'
import { availabilityFor, type Inventory } from '../lib/inventory'

export type StockState = {
  inventory: Inventory | null
  unavailable: 'api_unavailable' | 'invalid_data'
}

export const initialInventoryState: StockState = { inventory: null, unavailable: 'api_unavailable' }
export const InventoryContext = createContext(initialInventoryState)

export function useStockAvailability(productId: string) {
  const { inventory, unavailable } = useContext(InventoryContext)
  return availabilityFor(inventory, productId, Date.now(), unavailable)
}
