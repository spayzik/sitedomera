import { motion } from 'framer-motion'
import { CONTACTS, catalogSummary, formatRange } from '../data/products'
import { EditorialReveal } from './EditorialReveal'

const stats = [
  { value: catalogSummary.productCount, label: 'позиций в каталоге' },
  { value: catalogSummary.categoryCount, label: 'категорий материалов' },
  { value: formatRange(catalogSummary.panelThickness), label: 'толщина панелей, мм' },
  { value: formatRange(catalogSummary.panelWeight), label: 'вес панелей, кг' },
]

export function Manifest() {
  return (
    <section className="section manifest" id="manifest">
      <div className="manifest-ghost" aria-hidden="true">АРХИТЕКТУРА</div>
      <div className="container">
        <div className="manifest-text">
          <motion.p
            className="eyebrow"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
          >
            {CONTACTS.brand} · Философия материала
          </motion.p>
          <h2 className="manifest-title" aria-label="У нас стены, которые хочется трогать">
            <EditorialReveal lines={['У нас стены,', <>которые <em>хочется трогать</em></>]} />
          </h2>
          <motion.p
            className="manifest-lead"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            Бамбуковый композит ДЕКОРАЙ сочетает точность архитектурной геометрии
            и тактильную теплоту натуральных фактур. Панель — это не отделка,
            а отношение к пространству.
          </motion.p>
        </div>

        <div className="manifest-stats">
          {stats.map(({ label, value }) => (
            <div key={label} className="manifest-stat">
              <span className="manifest-stat-num">{value}</span>
              <span className="manifest-stat-label">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
