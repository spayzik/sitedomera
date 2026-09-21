import { motion } from 'framer-motion'
import { CONTACTS } from '../data/products'
import { Counter } from './Counter'

const stats = [
  { to: 3000, suffix: '', text: null as null, label: 'высота панели, мм' },
  { to: 5, suffix: '', text: null, label: 'толщина, мм' },
  { to: 13, suffix: '', text: null, label: 'вес панели, кг' },
  { to: null as null, suffix: '', text: '0,7', label: 'плотность, г/см³' },
]

export function Manifest() {
  return (
    <section className="section manifest" id="manifest">
      <div className="container">
        <div className="manifest-ghost">Фактуры</div>
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
          <motion.h2
            className="manifest-title"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            У нас стены,<br />
            которые <em>хочется трогать</em>
          </motion.h2>
          <motion.p
            className="manifest-lead"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            Бамбуковый композит Домэра сочетает точность архитектурной геометрии
            и тактильную теплоту натуральных фактур. Панель — это не отделка,
            а отношение к пространству.
          </motion.p>
        </div>

        <div className="manifest-stats">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              className="manifest-stat"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="manifest-stat-num">
                {s.to != null ? <Counter to={s.to} suffix={s.suffix} /> : s.text}
              </span>
              <span className="manifest-stat-label">{s.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}