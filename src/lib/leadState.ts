import { createContext, useContext } from 'react'
import type { LeadTerms } from './leadClient'
import type { LeadIntent } from './leadIntents'

type LeadService = {
  terms: LeadTerms | null
  open: (intent: LeadIntent, context?: string) => void
}

export const LeadContext = createContext<LeadService | null>(null)

export function useLeadService() {
  return useContext(LeadContext)
}
