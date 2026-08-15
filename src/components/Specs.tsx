import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'

const features = [
  { num: '01', title: 'Всего 13 кг', text: 'Легкая панель полного формата — удобный и безопасный монтаж вдвоем без спецтехники. Панель держит геометрию и не теряет форму со временем.' },
  { num: '02', title: 'Монтаж на клей', text: 'Без видимого крепежа и грязных работ. Идеальная стыковка скрытыми профилями, бесшовная поверхность по всей стене.' },
  { num: '03', title: 'Влагостойкость', text: 'Композит устойчив к влаге и перепадам температур. Подходит для любых жилых зон — от кухни до ванной.' },
  { num: '04', title: '4 слоя защиты', text: 'Декоративная пленка, клей PUR, со-экструзия и бамбук-полимерный сердечник (ABA). Полная структура — в секции ниже.' },
]

const layers = [
  { label: 'Финишный слой', detail: 'Премиальная декоративная пленка', kg: '0,2 кг' },
  { label: 'Клей PUR', detail: 'Монолитная фиксация слоев', kg: '0,3 кг' },
  { label: 'Сердечник ABA', detail: 'Бамбук-полимерный композит', kg: '11,9 кг' },
  { label: 'Со-экструзия', detail: 'Защита кромки и тыльной стороны', kg: '0,6 кг' },
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
            Современное решение для отделки стен: легкие, прочные, устойчивые к влаге.
            Композитная основа из бамбукового волокна.
          </p>
        </div>

        <div className="specs-new">
          {/* Interactive feature list */}
          <div className="specs-features">
            {features.map((f, i) => (
              <motion.button
                key={f.num}
                className={`specs-feature ${open === i ? 'active' : ''}`}
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
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="eyebrow" style={{ marginBottom: '1rem' }}>Структура панели</p>
            <div className="stack-total">
              <span className="stack-big">13</span>
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
                  <span className="stack-kg">{l.kg}</span>
                </div>
              ))}
            </div>
            <p className="stack-note">
              Полный вес панели 1220 × 3000 мм — всего 13 кг.
            </p>
          </motion.div>
        </div>

      </div>
    </section>
  )
}