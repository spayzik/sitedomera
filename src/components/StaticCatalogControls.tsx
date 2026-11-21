import { useContext, useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useCart } from '../context/CartContext'
import { InventoryContext } from '../context/inventoryState'
import { products, type CollectionId } from '../data/products'
import { availabilityFor } from '../lib/inventory'
import { catalogResults, parseCatalogFilters, writeCatalogFilters, type CatalogFilters } from '../lib/catalogFilters'
import { CatalogFilterControls } from './CatalogFilterControls'

export function StaticCatalogControls({ category }: { category?: CollectionId }) {
  const state = useContext(InventoryContext)
  const { add } = useCart()
  const [filters, setFilters] = useState(() => parseCatalogFilters(new URLSearchParams(location.search), category))
  const [list] = useState(() => document.querySelector('[data-catalog-list]'))
  const [cards] = useState(() => new Map(Array.from(list?.querySelectorAll<HTMLElement>('[data-catalog-product]') ?? [],
    card => [card.dataset.catalogProduct, card])))
  const [actionTargets] = useState(() => Array.from(list?.querySelectorAll<HTMLElement>('[data-catalog-actions]') ?? []))

  useEffect(() => {
    const sync = () => setFilters(parseCatalogFilters(new URLSearchParams(location.search), category))
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [category])

  const now = Date.now()
  const results = catalogResults(filters, id => availabilityFor(state.inventory, id, now, state.unavailable).status)
  useLayoutEffect(() => {
    const visibleIds = new Set(results.map(product => product.id))
    for (const [id, card] of cards) card.hidden = !id || !visibleIds.has(id)
    // Preserve DOM order for keyboard and screen reader users when sorting.
    let cursor = list?.firstElementChild
    for (const { id } of results) {
      const card = cards.get(id)
      if (!card) continue
      if (card === cursor) cursor = cursor.nextElementSibling
      else list?.insertBefore(card, cursor ?? null)
    }
  }, [cards, list, results])

  const update = (next: CatalogFilters, replace = false) => {
    const url = new URL(location.href)
    const params = writeCatalogFilters(url.searchParams, next, category)
    url.search = params.toString()
    if (url.href !== location.href) {
      if (replace) history.replaceState(history.state, '', url)
      else history.pushState(history.state, '', url)
    }
    setFilters(parseCatalogFilters(params, category))
  }

  return <>
    <CatalogFilterControls filters={filters} showCategory={!category}
      onChange={patch => update({ ...filters, ...patch }, patch.query !== undefined)}
      reset={() => update(parseCatalogFilters(new URLSearchParams(), category))} />
    <p className="seo-catalog-count" role="status">
      {results.length ? `Показано ${results.length} из ${cards.size}` : 'По вашему запросу ничего не найдено.'}
    </p>
    {actionTargets.map(target => {
      const product = products.find(item => item.id === target.dataset.catalogActions)
      return product ? createPortal(<button type="button" className="seo-card-add"
        onClick={() => add(product)} aria-label={`В подборку: ${product.name}`}>В подборку</button>, target, product.id) : null
    })}
  </>
}
