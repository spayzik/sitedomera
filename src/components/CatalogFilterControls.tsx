import { StoreSelect } from './StoreSelect'
import { useId, useRef } from 'react'
import { trackAnalyticsGoal } from '../lib/analytics'
import { collections } from '../data/products'
import { catalogFilterOptions, type CatalogFilters } from '../lib/catalogFilters'
import './CatalogFilters.css'

export function CatalogFilterControls({ filters, showCategory, onChange, reset }: {
  filters: CatalogFilters
  showCategory?: boolean
  onChange: (patch: Partial<CatalogFilters>) => void
  reset: () => void
}) {
  const id = useId()
  const lastSearch = useRef('')
  function reportSearch(query: string) {
    const normalized = query.trim()
    if (normalized && normalized !== lastSearch.current) trackAnalyticsGoal('catalog_search')
    lastSearch.current = normalized
  }
  function changeFilter(patch: Partial<CatalogFilters>) {
    if (!Object.entries(patch).some(([field, value]) => filters[field as keyof CatalogFilters] !== value)) return
    onChange(patch)
    trackAnalyticsGoal('catalog_filter')
  }
  const { thicknesses } = catalogFilterOptions(filters.category)
  const hasFilters = filters.query || filters.stock || filters.sort || filters.thickness || (showCategory && filters.category !== 'all')

  return (
    <div className="catalog-filter-controls" role="group" aria-label="Фильтры каталога">
      <label htmlFor={id + '-query'} className="catalog-filter-search">
        Поиск по названию или артикулу
        <input id={id + '-query'} type="search" className="ym-disable-keys" value={filters.query} maxLength={100}
          onChange={event => onChange({ query: event.target.value })}
          onBlur={event => reportSearch(event.currentTarget.value)}
          onKeyDown={event => { if (event.key === 'Enter') reportSearch(event.currentTarget.value) }} placeholder="Например, Ясень или A9001" />
      </label>
      {showCategory && <div className="catalog-filter-field"><label htmlFor={id + '-category'}>
        Коллекция и фактура</label>
        <StoreSelect id={id + '-category'} label="Коллекция и фактура" value={filters.category}
          onChange={value => changeFilter({ category: value as CatalogFilters['category'], thickness: '' })}>
          <option value="all">Все коллекции</option>
          {collections.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
        </StoreSelect>
      </div>}
      <div className="catalog-filter-field"><label htmlFor={id + '-stock'}>
        Наличие</label>
        <StoreSelect id={id + '-stock'} label="Наличие" value={filters.stock} onChange={value => changeFilter({ stock: value as CatalogFilters['stock'] })}>
          <option value="">Любое</option>
          <option value="in_stock">В наличии</option>
          <option value="out_of_stock">Нет в наличии</option>
          <option value="unknown">Уточняется</option>
        </StoreSelect>
      </div>
      {!!thicknesses.length && <div className="catalog-filter-field"><label htmlFor={id + '-thickness'}>
        Толщина</label>
        <StoreSelect id={id + '-thickness'} label="Толщина" value={filters.thickness} onChange={value => changeFilter({ thickness: value })}>
          <option value="">Любая</option>
          {thicknesses.map(value => <option key={value} value={String(value)}>{value.toLocaleString('ru-RU')} мм</option>)}
        </StoreSelect>
      </div>}
      <div className="catalog-filter-field"><label htmlFor={id + '-sort'}>
        Сортировка</label>
        <StoreSelect id={id + '-sort'} label="Сортировка" value={filters.sort} onChange={value => changeFilter({ sort: value as CatalogFilters['sort'] })}>
          <option value="">По умолчанию</option>
          <option value="price-asc">Сначала дешевле</option>
          <option value="price-desc">Сначала дороже</option>
          <option value="name">По названию</option>
        </StoreSelect>
      </div>
      {hasFilters && <button className="catalog-filter-reset" type="button" onClick={() => { reset(); lastSearch.current = ''; trackAnalyticsGoal('catalog_filter') }}>Сбросить фильтры</button>}
    </div>
  )
}
