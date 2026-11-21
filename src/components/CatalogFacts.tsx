import { catalogSummary, formatRange } from '../data/products'
import './CatalogFacts.css'

const facts = [
  ['Позиций в каталоге', catalogSummary.productCount],
  ['Коллекций и серий', catalogSummary.categoryCount],
  ['Ширина листа', formatRange(catalogSummary.sheetWidth) + ' мм'],
  ['Вес панелей по каталогу', formatRange(catalogSummary.panelWeight) + ' кг'],
] as const

export function CatalogFacts() {
  return <div className="catalog-facts">
    <dl className="container catalog-facts-grid">
      {facts.map(([label, value]) => <div key={label}>
        <dt>{label}</dt><dd>{value}</dd>
      </div>)}
    </dl>
  </div>
}
