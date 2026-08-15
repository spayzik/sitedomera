import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { products } from '../data/products'
import { useCart } from '../context/CartContext'
import { Counter } from './Counter'
import { ArrowRight, ArrowUpRight } from 'lucide-react'

const PANEL_AREA = 1.22 * 3 // лист 1220×3000 мм = 3.66 м²

export function Calculator() {
  const { add } = useCart()
  const [length, setLength] = useState('10')
  const [height, setHeight] = useState('2.5')
  const [openings, setOpenings] = useState('0')

  const res = useMemo(() => {
    const l = parseFloat(length.replace(',', '.')) || 0
    const h = parseFloat(height.replace(',', '.')) || 0
    const o = parseFloat(openings.replace(',', '.')) || 0
    const area = Math.max(l * h - o, 0)
    const sheets = Math.ceil(area / PANEL_AREA)
    const panel = products.find((p) => p.id === '919-4') ?? products[0]
    return { area, sheets, panel }
  }, [length, height, openings])

  const price = res.sheets * res.panel.price

  const input = (
    w: string,
    set: (v: string) => void,
    label: string,
    unit: string,
  ) => (
    <div className="form-group" key={label}>
      <label>{label}</label>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <input
          type="text"
          inputMode="decimal"
          value={w}
          onChange={(e) => set(e.target.value)}
        />
        <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{unit}</span>
      </div>
    </div>
  )

  return (
    <section className="section calculator" id="calculator">
      <div className="container">
        <div className="catalog-header" style={{ marginBottom: '3rem' }}>
          <div>
            <p className="eyebrow">Калькулятор</p>
            <h2>Сколько панелей<br/>нужно?</h2>
          </div>
          <p className="lead">
            Посчитайте количество листов 1220 × 3000 мм и ориентировочную
            стоимость под ваши стены. Точный расчёт с профилями сделает менеджер.
          </p>
        </div>

        <div className="split-grid calc-grid" style={{ gap: '4rem' }}>
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="modern-form">
              {input(length, setLength, 'Общая длина стен', 'м')}
              {input(height, setHeight, 'Высота стен', 'м')}
              {input(openings, setOpenings, 'Окна и двери (вычитаем)', 'м²')}
            </div>

            <div className="calc-note">
              <span className="calc-note-icon">i</span>
              <p>
                Один лист закрывает <strong>{PANEL_AREA.toFixed(2).replace('.', ',')} м²</strong>.
                Рекомендуем брать запас 5–10% на подрезку.
              </p>
            </div>
          </motion.div>

          <motion.div
            className="split-form calc-result"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="eyebrow">Результат</p>
            <div className="calc-big">
              <Counter to={res.sheets} />
              <span>панелей</span>
            </div>
            <div className="calc-rows">
              <div className="calc-row"><span>Площадь стен</span><strong>{Math.round(res.area)} м²</strong></div>
              <div className="calc-row"><span>Цена панели</span><strong>{res.panel.price.toLocaleString('ru-RU')} ₽</strong></div>
              <div className="calc-row total"><span>Стоимость</span><strong>{price.toLocaleString('ru-RU')} ₽</strong></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
              <button
                className="btn btn-primary interactive"
                onClick={() => add(res.panel, res.sheets)}
              >
                Добавить {res.sheets} панелей в заказ <ArrowRight size={16} />
              </button>
              <a href="#showroom" className="btn btn-white interactive" style={{ justifyContent: 'center' }}>
                Получить точный расчёт с профилями <ArrowUpRight size={16} />
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}