import { ArrowRight, Ruler, Scale } from 'lucide-react'
import { catalogSummary, formatRange } from '../data/products'
import './CatalogFacts.css'

const facts = [
  ['Позиций в каталоге', catalogSummary.productCount],
  ['Коллекций и серий', catalogSummary.categoryCount],
  ['Ширина листа', formatRange(catalogSummary.sheetWidth) + ' мм', Ruler],
  ['Вес панелей по каталогу', formatRange(catalogSummary.panelWeight) + ' кг', Scale],
] as const

export function CatalogFacts() {
  return <div className="catalog-facts catalog-page-metrics">
    <dl className="container catalog-facts-grid metrics-row">
      {facts.map(([label, value, Icon]) => <div key={label}>
        <dt>{label}{Icon && <Icon size={12} aria-hidden="true" />}</dt><dd>{value}</dd>
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
  return <div className="hero-arch-bottom home-overview">
    <div className="container bottom-grid home-overview-inner">
      <dl>
        {overview.map(([label, value]) => <div key={label} className="bottom-stat"><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      <a className="btn-explore interactive" href="./catalog/">Открыть каталог <ArrowRight size={16} aria-hidden="true" /></a>
    </div>
  </div>
}
