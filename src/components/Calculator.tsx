import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { sheetProducts, CONTACTS, formatDimensions } from '../data/products'
import { useCart } from '../context/CartContext'
import { Counter } from './Counter'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { buildTelegramDraftUrl, formatCalculatorTelegramMessage } from '../lib/telegramLink'
import { calculatePanels, sheetArea } from '../lib/calculator'

export function Calculator() {
  const { add } = useCart()
  const [materialId, setMaterialId] = useState('')
  const selectedPanel = sheetProducts.find(p => p.id === materialId) ?? null
  const [length, setLength] = useState('10')
  const [height, setHeight] = useState('2.5')
  const [openings, setOpenings] = useState('0')

  const res = useMemo(() => {
    return { ...calculatePanels(length, height, openings, selectedPanel), panel: selectedPanel }
  }, [length, height, openings, selectedPanel])

  const price = res.panel ? res.sheets * res.panel.priceRub : 0
  const telegramDraftUrl = res.panel && res.valid && res.sheets > 0
    ? buildTelegramDraftUrl(CONTACTS.telegram, formatCalculatorTelegramMessage({
      area: res.area, sheets: res.sheets, panel: res.panel, total: price,
    }))
    : null

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
          aria-label={label}
          maxLength={16}
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
            <h2>Сколько листов<br/>нужно?</h2>
          </div>
          <p className="lead">
            Выберите листовой материал и посчитайте ориентировочную
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
              <div className="form-group">
                <label htmlFor="calculator-material">Листовой материал</label>
                <select id="calculator-material" className="catalog-select" value={materialId} onChange={e => setMaterialId(e.target.value)}>
                  <option value="">Выберите материал</option>
                  {sheetProducts.map(p => <option key={p.id} value={p.id}>{p.name} — {p.priceRub.toLocaleString('ru-RU')} ₽/{p.unit}</option>)}
                </select>
                {res.panel && <span>{formatDimensions(res.panel)}</span>}
              </div>
              {input(length, setLength, 'Общая длина стен', 'м')}
              {input(height, setHeight, 'Высота стен', 'м')}
              {input(openings, setOpenings, 'Окна и двери (вычитаем)', 'м²')}
            </div>
            {res.panel && !res.valid && <p role="status">Введите числа от 0 до 10 000; дробную часть можно отделять точкой или запятой.</p>}

            <div className="calc-note">
              <span className="calc-note-icon">i</span>
              <p>
                {res.panel ? <>Один лист закрывает <strong>{sheetArea(res.panel).toLocaleString('ru-RU', { maximumFractionDigits: 3 })} м²</strong>.</> : 'Выберите материал: размер и цена будут взяты из его карточки.'}
                {' '}Рекомендуем брать запас 5–10% на подрезку.
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
            {res.panel && <div className="calc-big">
              <Counter to={res.sheets} />
              <span>листов</span>
            </div>}
            {res.panel ? <div className="calc-rows">
              <div className="calc-row"><span>Площадь стен</span><strong>{res.area.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} м²</strong></div>
              <div className="calc-row"><span>Цена материала</span><strong>{res.panel.priceRub.toLocaleString('ru-RU')} ₽/{res.panel.unit}</strong></div>
              <div className="calc-row total"><span>Стоимость</span><strong>{price.toLocaleString('ru-RU')} ₽</strong></div>
            </div> : <p role="status">Выберите листовой материал для расчёта.</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
              <button
                className="btn btn-primary interactive"
                disabled={!res.panel || !res.valid || res.sheets < 1 || res.sheets > 9999}
                onClick={() => { if (res.panel && res.valid) add(res.panel, res.sheets) }}
              >
                Добавить {res.sheets} листов в подборку <ArrowRight size={16} />
              </button>
              {res.sheets > 9999 && <p>Такой объём уточните у менеджера в Telegram: подборка ограничена 9 999 единицами одного товара.</p>}

              <div className="contact-inline">
                <p className="eyebrow" style={{ margin: 0 }}>Точный расчёт с профилями</p>
                <p>Менеджер уточнит детали проекта. Расчёт попадёт в черновик Telegram только после вашего нажатия; сообщение вы отправите сами.</p>
                {telegramDraftUrl && (
                  <a className="btn btn-white btn-full interactive" href={telegramDraftUrl} target="_blank" rel="noreferrer">
                    Уточнить расчёт в Telegram <ArrowUpRight size={16} />
                  </a>
                )}
                <a className="contact-inline-phone interactive" href={`tel:${CONTACTS.phoneRaw}`}>
                  Позвонить: {CONTACTS.phone}
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
