import { ArrowRight } from 'lucide-react'
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

const overview = [
  ['Каталог', `${catalogSummary.productCount} позиций · ${catalogSummary.categoryCount} категорий`],
  ['Панели', `${formatRange(catalogSummary.panelThickness)} мм · ${formatRange(catalogSummary.panelWeight)} кг`],
  ['Материалы', 'Листы, рейки и профили'],
]

export function HomeOverview() {
  return <div className="catalog-facts home-overview">
    <div className="container home-overview-inner">
      <dl>
        {overview.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      <a href="./catalog/">Открыть каталог <ArrowRight size={16} aria-hidden="true" /></a>
    </div>
  </div>
}
