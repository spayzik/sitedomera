import { useMemo, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { products, CONTACTS } from '../data/products'
import { useCart } from '../context/CartContext'
import { sendLead } from '../lib/telegram'
import { PhoneInput } from './PhoneInput'
import { Counter } from './Counter'
import { ArrowRight, ArrowUpRight } from 'lucide-react'

const PANEL_AREA = 1.22 * 3 // лист 1220×3000 мм = 3.66 м²

export function Calculator() {
  const { add } = useCart()
  const [length, setLength] = useState('10')
  const [height, setHeight] = useState('2.5')
  const [openings, setOpenings] = useState('0')
  const [leadStatus, setLeadStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const [leadFallback, setLeadFallback] = useState<{ tg?: string; tel?: string }>({})

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

  const onLeadSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLeadStatus('loading')
    const fd = new FormData(e.currentTarget)
    const res2 = await sendLead({
      type: 'contact',
      name: String(fd.get('name') || ''),
      phone: String(fd.get('phone') || ''),
      message: `Расчёт из калькулятора: ${Math.round(res.area)} м² → ${res.sheets} панелей (${res.panel.name}, ${res.panel.sku}), ориентир ${price.toLocaleString('ru-RU')} ₽`,
    })
    if (res2.ok) {
      setLeadStatus('ok')
    } else {
      setLeadFallback({ tg: res2.tg, tel: res2.tel })
      setLeadStatus('err')
    }
  }

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

              <form className="modern-form" onSubmit={onLeadSubmit} style={{ gap: '1rem', marginTop: '0.5rem' }}>
                <p className="eyebrow" style={{ margin: 0 }}>
                  Точный расчёт с профилями — бесплатно
                </p>
                <input name="name" required placeholder="Имя" />
                <PhoneInput required />
                {leadStatus === 'ok' && (
                  <p className="status-msg ok">Заявка отправлена! Менеджер пришлёт расчёт.</p>
                )}
                {leadStatus === 'err' && (
                  <p className="form-error">
                    Не удалось отправить. Позвоните:{' '}
                    <a href={`tel:${leadFallback.tel}`}>{CONTACTS.phone}</a> или напишите в{' '}
                    <a href={leadFallback.tg} target="_blank" rel="noreferrer">Telegram</a>.
                  </p>
                )}
                <button
                  className="btn btn-white interactive"
                  type="submit"
                  disabled={leadStatus === 'loading' || leadStatus === 'ok'}
                  style={{ justifyContent: 'center' }}
                >
                  {leadStatus === 'loading' ? 'Отправляем...' : leadStatus === 'ok' ? 'Отправлено' : (
                    <>Получить точный расчёт <ArrowUpRight size={16} /></>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}