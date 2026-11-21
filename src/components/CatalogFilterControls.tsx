import { useId } from 'react'
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
  const { thicknesses } = catalogFilterOptions(filters.category)
  const hasFilters = filters.query || filters.stock || filters.sort || filters.thickness || (showCategory && filters.category !== 'all')

  return (
    <div className="catalog-filter-controls" role="group" aria-label="Фильтры каталога">
      <label htmlFor={id + '-query'} className="catalog-filter-search">
        Поиск по названию или артикулу
        <input id={id + '-query'} type="search" value={filters.query} maxLength={100}
          onChange={event => onChange({ query: event.target.value })} placeholder="Например, Ясень или A9001" />
      </label>
      {showCategory && <label htmlFor={id + '-category'}>
        Коллекция и фактура
        <select id={id + '-category'} value={filters.category}
          onChange={event => onChange({ category: event.target.value as CatalogFilters['category'], thickness: '' })}>
          <option value="all">Все коллекции</option>
          {collections.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </label>}
      <label htmlFor={id + '-stock'}>
        Наличие
        <select id={id + '-stock'} value={filters.stock} onChange={event => onChange({ stock: event.target.value as CatalogFilters['stock'] })}>
          <option value="">Любое</option>
          <option value="in_stock">В наличии</option>
          <option value="out_of_stock">Нет в наличии</option>
          <option value="unknown">Уточняется</option>
        </select>
      </label>
      {!!thicknesses.length && <label htmlFor={id + '-thickness'}>
        Толщина
        <select id={id + '-thickness'} value={filters.thickness} onChange={event => onChange({ thickness: event.target.value })}>
          <option value="">Любая</option>
          {thicknesses.map(value => <option key={value} value={String(value)}>{value.toLocaleString('ru-RU')} мм</option>)}
        </select>
      </label>}
      <label htmlFor={id + '-sort'}>
        Сортировка
        <select id={id + '-sort'} value={filters.sort} onChange={event => onChange({ sort: event.target.value as CatalogFilters['sort'] })}>
          <option value="">По умолчанию</option>
          <option value="price-asc">Сначала дешевле</option>
          <option value="price-desc">Сначала дороже</option>
          <option value="name">По названию</option>
        </select>
      </label>
      {hasFilters && <button className="catalog-filter-reset" type="button" onClick={reset}>Сбросить фильтры</button>}
    </div>
  )
}
