import { useEffect, useState, type RefObject } from 'react'
import { cartSnapshot, type CartItem } from '../lib/cart'
import { fetchLeadTerms, leadEndpoint, type LeadAttempt, type LeadTerms } from '../lib/leadClient'
import { LeadForm } from './LeadForm'
import { useLeadService } from '../lib/leadState'

export type { LeadAttempt } from '../lib/leadClient'
type Props = { items: readonly CartItem[]; attempt: RefObject<LeadAttempt | null> }

export function CartLeadForm({ items, attempt }: Props) {
  const service = useLeadService()
  const [localTerms, setLocalTerms] = useState<LeadTerms | null>(null)
  const standalone = !service
  useEffect(() => {
    if (!standalone || !leadEndpoint) return
    const controller = new AbortController()
    let mounted = true
    void fetchLeadTerms(leadEndpoint, controller).then(terms => { if (mounted) setLocalTerms(terms) })
    return () => {
      mounted = false
      controller.abort()
    }
  }, [standalone])

  const terms = service ? service.terms : localTerms
  if (!leadEndpoint || !terms?.cart || items.length === 0) return null
  const snapshot = cartSnapshot(items).sort((a, b) => a.id.localeCompare(b.id, 'en'))
  return <LeadForm endpoint={leadEndpoint} terms={terms} fields={{ items: snapshot }} attempt={attempt} />
}
