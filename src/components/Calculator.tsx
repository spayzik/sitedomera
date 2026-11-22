import { contactLinks } from '../lib/contactLinks'
import { SocialContacts } from './SocialContacts'
import { LeadAction } from './LeadProvider'
import { SheetUnitPrice } from './SheetUnitPrice'
import { StockAvailability } from './StockAvailability'
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { sheetProducts, CONTACTS, formatDimensions } from '../data/products'
import { useCart } from '../context/CartContext'
import { Counter } from './Counter'
import { ArrowRight, Plus, X } from 'lucide-react'
import { buildTelegramDraftUrl, formatCalculatorTelegramMessage } from '../lib/telegramLink'
import { calculateProjectPanels, calculateWallLayout, calculatorWall, sheetArea, type WallDimensions } from '../lib/calculator'
import { trackAnalyticsGoal } from '../lib/analytics'

export function Calculator({ standalone = false, base = './' }: { standalone?: boolean; base?: string } = {}) {
  const initialSearch = ""
  const { add } = useCart()
  const [materialId, setMaterialId] = useState(() => new URLSearchParams(initialSearch).get('material') ?? '')
  const selectedPanel = sheetProducts.find(p => p.id === materialId) ?? null
  const [walls, setWalls] = useState<Array<WallDimensions & { id: number }>>(() => [{ id: 0, ...calculatorWall(new URLSearchParams(initialSearch)) }])
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setMaterialId(params.get('material') ?? '')
    setWalls([{ id: 0, ...calculatorWall(params) }])
  }, [])
  const nextWall = useRef(1)
  const [openings, setOpenings] = useState('0')
  const [reserve, setReserve] = useState('10')
  const [vertical, setVertical] = useState(false)
  const setDimension = (id: number, field: keyof WallDimensions, value: string) =>
    setWalls(previous => previous.map(wall => wall.id === id ? { ...wall, [field]: value } : wall))

  const res = useMemo(() => {
    const estimate = calculateProjectPanels(walls, vertical ? '0' : openings, reserve, selectedPanel)
    const sheets = vertical && estimate.valid ? calculateWallLayout(walls, reserve, selectedPanel) ?? 0 : estimate.sheets
    return { ...estimate, sheets, panel: selectedPanel }
  }, [walls, openings, reserve, selectedPanel, vertical])

  const price = res.panel ? res.sheets * res.panel.priceRub : 0
  const completed = Boolean(res.panel && res.valid && res.sheets > 0)
  const reportedCompletion = useRef(false)
  useEffect(() => {
    if (!completed || reportedCompletion.current) return
    reportedCompletion.current = true
    trackAnalyticsGoal('calculator_complete')
  }, [completed])
  const method = vertical ? 'Вертикальная раскладка без вычета проёмов и повторного использования обрезков' : 'Оценка по площади с вычетом проёмов'
  const draft = res.panel && res.valid && res.sheets > 0
    ? formatCalculatorTelegramMessage({ area: res.area, sheets: res.sheets, panel: res.panel, total: price }) + '\n\n' + method + '. Запас: ' + reserve + '%.'
    : null
  const telegramDraftUrl = draft ? buildTelegramDraftUrl(CONTACTS.telegram, draft) : null
  const whatsappDraftUrl = draft && contactLinks.whatsapp
    ? contactLinks.whatsapp + '?text=' + encodeURIComponent(draft)
    : null

  const input = (
    w: string,
    set: (v: string) => void,
    label: string,
    unit: string,
  ) => (
    <div className="form-group" key={label}>
      <label>{label}</label>
      <div className="calc-input-unit">
        <input
          type="text"
          inputMode="decimal"
          aria-label={label}
          maxLength={16}
          value={w}
          onChange={(e) => set(e.target.value)}
        />
        <span aria-hidden="true">{unit}</span>
      </div>
    </div>
  )

  return (
    <section className="section calculator" id="calculator">
      <div className="container">
        {!standalone && <div className="catalog-header" style={{ marginBottom: '3rem' }}>
          <div>
            <p className="eyebrow">Калькулятор</p>
            <h2>Сколько листов<br/>нужно?</h2>
          </div>
          <p className="lead">
            Выберите листовой материал и посчитайте ориентировочную
            стоимость под ваши стены. Точный расчёт с профилями сделает менеджер.
          </p>
        </div>}

        <div className="calc-grid">
          <motion.div className="calc-editor"
            initial={standalone ? false : { opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="modern-form">
              <div className="form-group">
                <label htmlFor="calculator-material">Листовой материал</label>
                <select id="calculator-material" className="catalog-select calc-select" value={materialId} onChange={e => setMaterialId(e.target.value)}>
                  <option value="">Выберите материал</option>
                  {sheetProducts.map(p => <option key={p.id} value={p.id}>{p.name} — {p.priceRub.toLocaleString('ru-RU')} ₽/{p.unit}</option>)}
                </select>
                {res.panel && <span>{formatDimensions(res.panel)}</span>}
              </div>
              <div className="calc-walls">
              {walls.map((wall, index) => (
                <fieldset key={wall.id} className="calc-wall">
                  <legend>Стена {index + 1}</legend>
                  {input(wall.length, value => setDimension(wall.id, 'length', value), 'Ширина стены ' + (index + 1), 'м')}
                  {input(wall.height, value => setDimension(wall.id, 'height', value), 'Высота стены ' + (index + 1), 'м')}
                  {walls.length > 1 && <button type="button" className="secondary-action calc-remove-wall" onClick={() => setWalls(previous => previous.filter(value => value.id !== wall.id))}><X size={14} aria-hidden="true" /> Убрать стену {index + 1}</button>}
                </fieldset>
              ))}
              <button type="button" className="secondary-action" disabled={walls.length >= 20} onClick={() => {
                const id = nextWall.current++
                setWalls(previous => [...previous, { id, length: '', height: '' }])
              }}><Plus size={16} aria-hidden="true" /> Добавить стену</button>
              </div>
              <div className="calc-adjustments">
              {!vertical && input(openings, setOpenings, 'Общая площадь проёмов', 'м²')}
              {input(reserve, setReserve, 'Запас на подрезку', '%')}
              </div>
              <div className="form-group">
                <label htmlFor="calculator-method">Способ оценки</label>
                <select id="calculator-method" className="catalog-select" value={vertical ? 'vertical' : 'area'}
                  onChange={event => setVertical(event.target.value === 'vertical')}>
                  <option value="area">По площади с вычетом проёмов</option>
                  <option value="vertical">По вертикальной раскладке</option>
                </select>
                {vertical && <p>Считаем ряды по ширине и высоте каждой стены. В этой оценке проёмы не вычитаются, обрезки не используются повторно. Раскладку и швы уточнит менеджер.</p>}
              </div>
            </div>
            {res.panel && !res.valid && <p role="status">Введите размеры и площадь проёмов до 10 000, а запас — от 0 до 100%. Дробную часть можно отделять точкой или запятой.</p>}

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
            initial={standalone ? false : { opacity: 0, y: 40 }}
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
              <div className="calc-row"><span>{vertical ? 'Площадь стен без вычета проёмов' : 'Площадь стен за вычетом проёмов'}</span><strong>{res.area.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} м²</strong></div>
              {!vertical && <div className="calc-row"><span>Площадь с запасом</span><strong>{res.estimatedArea.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} м²</strong></div>}
              <div className="calc-row"><span>Цена материала</span><strong>{res.panel.priceRub.toLocaleString('ru-RU')} ₽/{res.panel.unit}<SheetUnitPrice product={res.panel} /></strong></div>
              <div className="calc-row total"><span>Стоимость</span><strong>{price.toLocaleString('ru-RU')} ₽</strong></div>
            </div> : <p role="status">Выберите листовой материал для расчёта.</p>}

            {res.panel && <StockAvailability productId={res.panel.id} />}

            <div className="calc-actions">
              <button
                className="btn btn-primary interactive"
                disabled={!res.panel || !res.valid || res.sheets < 1 || res.sheets > 9999}
                onClick={() => { if (res.panel && res.valid) add(res.panel, res.sheets) }}
              >
                В подборку{completed ? ` · ${res.sheets} лист.` : ''} <ArrowRight size={16} />
              </button>
              {res.sheets > 9999 && <p>Такой объём уточните у менеджера в Telegram: подборка ограничена 9 999 единицами одного товара.</p>}

              <div className="calc-followup">
                <p className="eyebrow" style={{ margin: 0 }}>Точный расчёт с профилями</p>
                <p>Менеджер поможет уточнить раскладку и комплектацию.</p>
                {res.panel && res.valid && res.sheets > 0 && res.sheets <= 9999 && (
                  <LeadAction intent="calculation" className="secondary-action"
                    context={[res.panel.name, res.panel.sku && res.panel.sku !== res.panel.name ? 'Артикул: ' + res.panel.sku : '',
                      res.sheets + ' лист.', price.toLocaleString('ru-RU') + ' ₽', method, 'Запас: ' + reserve + '%'].filter(Boolean).join(' · ')}>
                    Отправить расчёт в заявку
                  </LeadAction>
                )}
                <SocialContacts placement="product" base={base}
                  drafts={telegramDraftUrl ? { telegram: telegramDraftUrl, whatsapp: whatsappDraftUrl ?? undefined } : undefined} />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
