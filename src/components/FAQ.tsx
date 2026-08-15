import { useState } from 'react'
import { motion } from 'framer-motion'
import { faq } from '../data/products'
import { Plus } from 'lucide-react'

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="section faq" id="faq">
      <div className="container">
        <div className="section-head-flex">
          <div>
            <p className="eyebrow">Вопросы</p>
            <h2>Частые<br/>вопросы</h2>
          </div>
          <p className="lead">
            Размеры, цены, монтаж и доставка. Если ответа нет —
            напишите нам, укажем всё точно.
          </p>
        </div>

        <div className="faq-list">
          {faq.map((item, i) => {
            const isOpen = open === i
            return (
              <motion.div
                key={i}
                className={`faq-item ${isOpen ? 'open' : ''}`}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
              >
                <button
                  className="faq-q"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                >
                  <span>{item.q}</span>
                  <Plus size={20} className={`faq-plus ${isOpen ? 'rotated' : ''}`} />
                </button>
                <div className="faq-a" style={{ maxHeight: isOpen ? 240 : 0 }}>
                  <p>{item.a}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}