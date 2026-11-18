import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { catalogSummary, formatRange } from '../data/products'

const features = [
  { num: '01', title: formatRange(catalogSummary.panelWeight) + ' кг для панелей', text: 'Вес зависит от модели. Учитывайте его при расчёте нагрузки на основание.' },
  { num: '02', title: 'Подбор монтажа', text: 'Способ крепления, основание и совместимость профилей уточняются для выбранного материала.' },
  { num: '03', title: 'Разная толщина', text: 'Толщина панелей: ' + formatRange(catalogSummary.panelThickness) + ' мм в зависимости от модели. При подборе профиля учитывайте толщину панели.' },
  { num: '04', title: 'Конструкция бамбуковых панелей', text: 'В разрезе бамбуковой панели показаны четыре слоя: декоративное покрытие, клей, слой со-экструзии и композитный сердечник.' },
]
const layers = [
  { label: 'Декоративная плёнка', detail: 'Тип покрытия уточните по модели' },
  { label: 'Клей PUR', detail: 'Горячего нанесения' },
  { label: 'Со-экструзия', detail: 'Слой конструкции композитной панели' },
  { label: 'Сердечник ABA', detail: 'Бамбук-полимерный композит' },
]

export function Specs() {
  const [open, setOpen] = useState(0)

  return (
    <section className="section specs" id="specs">
      <div className="container">

        <div className="section-head-flex">
          <div>
            <p className="eyebrow">Технологии</p>
            <h2>Инновации<br/>в каждом слое</h2>
          </div>
          <p className="lead">
            Панели, гибкий камень, рейки и профили отличаются по конструкции.
            Ниже — вводное описание бамбуковых панелей; точные параметры смотрите в карточке.
          </p>
        </div>

        <div className="specs-new">
          {/* Interactive feature list */}
          <div className="specs-features">
            {features.map((f, i) => (
              <motion.button
                key={f.num}
                className={`specs-feature ${open === i ? 'active' : ''}`}
                aria-expanded={open === i}
                onMouseEnter={() => setOpen(i)}
                onClick={() => setOpen(i)}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="specs-feature-top">
                  <span className="num">{f.num}</span>
                  <span className="title">{f.title}</span>
                  <ArrowUpRight size={20} className="arrow" />
                </div>
                <AnimatePresence initial={false}>
                  {open === i && (
                    <motion.p
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="specs-feature-text"
                    >
                      {f.text}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.button>
            ))}
          </div>

          {/* Layered structure visual */}
          <motion.div
            className="specs-stack"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="eyebrow" style={{ marginBottom: '1rem' }}>Бамбуковые панели</p>
            <div className="stack-total">
              <span className="stack-big">{formatRange(catalogSummary.panelWeight)}</span>
              <span className="stack-unit">кг<br/>на панель</span>
            </div>
            <div className="stack-layers">
              {layers.map((l, i) => (
                <div key={l.label} className="stack-layer">
                  <div className="stack-layer-line">
                    <span className="stack-num">0{i + 1}</span>
                    <span className="stack-label">{l.label}</span>
                  </div>
                  <span className="stack-detail">{l.detail}</span>

                </div>
              ))}
            </div>
            <p className="stack-note">
              Подберём подходящую панель с учётом основания, нагрузки и способа монтажа.
            </p>
          </motion.div>
        </div>

      </div>
    </section>
  )
}
