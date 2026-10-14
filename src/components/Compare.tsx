import { motion } from 'framer-motion'
import { products, formatRange, formatDimensions, type Product, type ProductKind } from '../data/products'

const cols: { kind: ProductKind; title: string }[] = [
  { kind: 'panel', title: 'Панели' }, { kind: 'flexible_stone', title: 'Гибкий камень' },
  { kind: 'slat', title: 'Рейки' }, { kind: 'profile', title: 'Профили' },
]
const groups = cols.map(c => products.filter(p => p.kind === c.kind))
function specs(items: Product[], key: 'thicknessMm' | 'weightKg', unit: string) {
  const values = [...new Set(items.flatMap(p => p[key] === undefined ? [] : [p[key]!]))]
  return values.length ? values.sort((a, b) => a - b).map(n => n.toLocaleString('ru-RU')).join(' / ') + ' ' + unit : 'В PDF не указан' + (key === 'thicknessMm' ? 'а' : '')
}
const rows = [
  { param: 'Позиций в каталоге', values: groups.map(items => String(items.length)) },
  { param: 'Цена за единицу', values: groups.map(items => formatRange({ min: Math.min(...items.map(p => p.priceRub)), max: Math.max(...items.map(p => p.priceRub)) }) + ' ₽ / ' + [...new Set(items.map(p => p.unit))].join(' или ')) },
  { param: 'Размер', values: groups.map(items => [...new Set(items.map(formatDimensions))].join('; ')) },
  { param: 'Толщина', values: groups.map(items => specs(items, 'thicknessMm', 'мм')) },
  { param: 'Вес', values: groups.map(items => specs(items, 'weightKg', 'кг')) },
]

export function Compare() {
  return (
    <section className="section compare" id="compare">
      <div className="container">
        <div className="catalog-header" style={{ marginBottom: '3rem' }}>
          <div><p className="eyebrow">Характеристики</p><h2>Разные материалы<br/>для вашего проекта</h2></div>
          <p className="lead">Сводка по карточкам каталога 2026. Точные параметры выбранного изделия указаны в его карточке.</p>
        </div>
        <motion.div className="compare-scroll" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.8 }}>
          <table className="compare-table">
            <thead><tr><th className="compare-param">Параметр</th>{cols.map((c, i) => <th key={c.kind} className={i === 0 ? 'col-domera' : ''}>{c.title}</th>)}</tr></thead>
            <tbody>{rows.map(r => <tr key={r.param}><td className="compare-param">{r.param}</td>{r.values.map((v, i) => <td key={cols[i].kind} className={i === 0 ? 'col-domera' : ''}>{v}</td>)}</tr>)}</tbody>
          </table>
        </motion.div>
        <p className="compare-note">Отсутствующие в PDF значения не подставляются. Наличие, состав, совместимость и условия применения уточняйте по конкретной модели.</p>
      </div>
    </section>
  )
}
