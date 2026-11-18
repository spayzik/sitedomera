import { ArrowUpRight } from 'lucide-react'
import { products, formatRange, formatDimensions, type ProductKind, type CollectionId } from '../data/products'
import { updateCatalogHash } from '../lib/catalogNavigation'

const materials: { kind: ProductKind; category: CollectionId | 'all'; title: string; description: string }[] = [
  { kind: 'panel', category: 'all', title: 'Панели', description: 'Для отделки стен. В коллекции есть фактуры дерева, ткани и штукатурки.' },
  { kind: 'flexible_stone', category: 'flexible_stone', title: 'Гибкий камень', description: 'Листовой материал с каменной фактурой для отделки стен.' },
  { kind: 'slat', category: 'slats', title: 'Декоративные рейки', description: 'Для ритмичного рисунка стены, ниш и акцентных зон.' },
  { kind: 'profile', category: 'profiles', title: 'Профили', description: 'Для оформления стыков, углов и краёв облицовки.' },
]

export function Compare() {
  return (
    <section className="section compare" id="compare">
      <div className="container">
        <div className="section-head-flex">
          <div><p className="eyebrow">Материалы</p><h2>Подберите отделку<br />для своего проекта</h2></div>
          <p className="lead">Сравните форматы, цены и назначение материалов.</p>
        </div>
        <div className="material-grid">
          {materials.map(({ kind, category, title, description }) => {
            const items = products.filter(product => product.kind === kind)
            const prices = items.map(product => product.priceRub)
            const price = formatRange({ min: Math.min(...prices), max: Math.max(...prices) })
            const units = [...new Set(items.map(product => product.unit))]
            const sizes = [...new Set(items.map(formatDimensions))]
            return (
              <article key={kind} className="material-card">
                <h3>{title}</h3>
                <p>{description}</p>
                <dl>
                  <div><dt>Формат</dt><dd>{sizes.join(' · ')}</dd></div>
                  <div><dt>Цена за {units.join(' или ')}</dt><dd>{price} ₽</dd></div>
                </dl>
                <a className="material-link interactive" href={updateCatalogHash('#/catalog', { category })}>
                  {category === 'all' ? 'Открыть каталог' : 'Смотреть в каталоге'} <ArrowUpRight size={16} aria-hidden="true" />
                </a>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
