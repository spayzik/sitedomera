import { StoreSelect } from './StoreSelect'
import { contactLinks } from '../lib/contactLinks'
import { SocialContacts } from './SocialContacts'
import { LeadAction } from './LeadProvider'
import { SheetUnitPrice } from './SheetUnitPrice'
import { StockAvailability } from './StockAvailability'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { sheetProducts, CONTACTS, formatDimensions, type Product } from '../data/products'
import { useCart } from '../context/CartContext'
import { Counter } from './Counter'
import { ArrowRight, Plus, X } from 'lucide-react'
import { buildTelegramDraftUrl, formatCalculatorTelegramMessage } from '../lib/telegramLink'
import { calculateProjectPanels, calculateWallLayout, calculatorWall, openingsArea, sheetArea, type WallDimensions } from '../lib/calculator'
import { trackAnalyticsGoal } from '../lib/analytics'
import type { LeadCalculation } from '../lib/leadIntents'

import { MAX_QTY } from '../lib/cart'

function whatsappCalculatorDraft(message: string) {
  if (!contactLinks.whatsapp) return undefined
  const url = new URL(contactLinks.whatsapp)
  url.searchParams.set('text', message)
  return url.href
}

type MaterialEstimate = { panel: Product | null; sheets: number; valid: boolean; calculation: LeadCalculation | null }

export function Calculator({ standalone = false, base = './' }: { standalone?: boolean; base?: string } = {}) {
  const { add, items } = useCart()
  const [groups, setGroups] = useState([0])
  const nextGroup = useRef(1)
  const [estimates, setEstimates] = useState<Record<number, MaterialEstimate>>({})
  const report = useCallback((id: number, estimate: MaterialEstimate) => {
    setEstimates(previous => ({ ...previous, [id]: estimate }))
  }, [])
  function remove(id: number) {
    setGroups(previous => previous.filter(group => group !== id))
    setEstimates(previous => Object.fromEntries(Object.entries(previous).filter(([key]) => Number(key) !== id)))
  }

  const lines = new Map<string, { product: Product; quantity: number }>()
  const complete = groups.every(id => {
    const result = estimates[id]
    return result?.panel && result.valid && result.sheets > 0
  })
  if (complete) {
    for (const id of groups) {
      const { panel, sheets } = estimates[id]
      if (!panel) continue
      lines.set(panel.id, { product: panel, quantity: (lines.get(panel.id)?.quantity ?? 0) + sheets })
    }
  }
  const order = [...lines.values()]
  const calculation = complete ? groups.flatMap(id => {
    const estimate = estimates[id].calculation
    return estimate ? [estimate] : []
  }) : []
  const total = order.reduce((sum, line) => sum + line.product.priceRub * line.quantity, 0)
  const draftLines = order.map(({ product, quantity }) =>
    product.name + (product.sku && product.sku !== product.name ? ' · ' + product.sku : '') +
      ' · ' + quantity + ' лист. · ' + (product.priceRub * quantity).toLocaleString('ru-RU') + ' ₽')
  const summary = order.length > 0 ? draftLines.join('\n') + '\nИтого: ' +
    total.toLocaleString('ru-RU') + ' ₽' : ''
  const combinedDraft = summary ? 'Здравствуйте! Хочу обсудить расчёт материалов ДЕКОРАЙ.\n\n' + summary : ''
  const started = useRef(false)
  const reportStart = () => {
    if (started.current) return
    started.current = true
    trackAnalyticsGoal('calculator_start')
  }
  const fits = order.every(({ product, quantity }) =>
    quantity + (items.find(item => item.product.id === product.id)?.qty ?? 0) <= MAX_QTY)

  return <section className="section calculator" id="calculator">
    <div className="container">
      {!standalone && <div className="catalog-header">
        <div><p className="eyebrow">Калькулятор</p><h2>Сколько листов нужно?</h2></div>
        <p className="lead">Посчитайте панели для каждой стены или зоны и соберите материалы в одну подборку.</p>
      </div>}
      <div className="calc-project-groups" onChange={reportStart}>
        {groups.map((id, index) => <section key={id} aria-label={'Материал ' + (index + 1)}>
          {groups.length > 1 && <div className="calc-group-heading">
            <h2>Материал {index + 1}</h2>
            {id !== 0 && <button type="button" className="secondary-action" onClick={() => remove(id)}>
              <X size={14} aria-hidden="true" /> Убрать
            </button>}
          </div>}
          <MaterialCalculation id={id} standalone={standalone} base={base} report={report} onStart={reportStart} />
        </section>)}
        <button type="button" className="secondary-action" disabled={groups.length >= 10} onClick={() => {
          const id = nextGroup.current++
          setGroups(previous => [...previous, id])
        }}><Plus size={16} aria-hidden="true" /> Добавить другой материал</button>
        {groups.length > 1 && <section className="calc-project-total">
          <h2>Итого по материалам</h2>
          {complete ? <>
            {order.map(({ product, quantity }) => <div key={product.id} className="calc-row">
              <span>{product.name} · {quantity} лист.</span><strong>{(product.priceRub * quantity).toLocaleString('ru-RU')} ₽</strong>
            </div>)}
            <div className="calc-row total"><span>Стоимость материалов</span><strong>{total.toLocaleString('ru-RU')} ₽</strong></div>
          </> : <p>Выберите материал и укажите размеры для каждой группы.</p>}
          {!fits && <p role="status">С учётом подборки превышен лимит {MAX_QTY.toLocaleString('ru-RU')} единиц одного товара.</p>}
          <button type="button" className="btn btn-primary interactive" disabled={!complete || !fits}
            onClick={() => { if (complete && fits) order.forEach(({ product, quantity }) => add(product, quantity)) }}>
            Добавить все материалы в подборку <ArrowRight size={16} aria-hidden="true" />
          </button>
          {calculation.length === groups.length && <div className="calc-followup">
            <LeadAction intent="calculation" className="secondary-action" context="Сводный расчёт по нескольким материалам"
              details={{ calculation }}>Отправить весь расчёт в заявку</LeadAction>
            <SocialContacts placement="product" base={base} drafts={{
              telegram: buildTelegramDraftUrl(CONTACTS.telegram, combinedDraft),
              whatsapp: whatsappCalculatorDraft(combinedDraft),
            }} />
          </div>}
        </section>}
      </div>
    </div>
  </section>
}

function MaterialCalculation({ id, standalone, base, report, onStart }: {
  id: number; standalone: boolean; base: string; report: (id: number, estimate: MaterialEstimate) => void; onStart: () => void
}) {
  const suffix = id ? '-' + id : ''
  const initialSearch = ""
  const { add } = useCart()
  const [materialId, setMaterialId] = useState(() => new URLSearchParams(initialSearch).get('material') ?? '')
  const selectedPanel = sheetProducts.find(p => p.id === materialId) ?? null
  const [walls, setWalls] = useState<Array<WallDimensions & { id: number }>>(() => [{ id: 0, ...calculatorWall(new URLSearchParams(initialSearch)) }])
  useEffect(() => {
    if (id !== 0) { setWalls([{ id: 0, length: '', height: '' }]); return }
    const params = new URLSearchParams(window.location.search)
    setMaterialId(params.get('material') ?? '')
    setWalls([{ id: 0, ...calculatorWall(params) }])
  }, [id])
  const nextWall = useRef(1)
  const [openings, setOpenings] = useState('0')
  const [cutouts, setCutouts] = useState<Array<WallDimensions & { id: number }>>([])
  const nextCutout = useRef(0)
  const [reserve, setReserve] = useState('10')
  const [vertical, setVertical] = useState(false)
  const setDimension = (id: number, field: keyof WallDimensions, value: string) =>
    setWalls(previous => previous.map(wall => wall.id === id ? { ...wall, [field]: value } : wall))

  const res = useMemo(() => {
    const openingArea = vertical ? 0 : openingsArea(cutouts, openings)
    const estimate = calculateProjectPanels(walls, openingArea, reserve, selectedPanel)
    const sheets = vertical && estimate.valid ? calculateWallLayout(walls, reserve, selectedPanel) ?? 0 : estimate.sheets
    return { ...estimate, sheets, panel: selectedPanel, openingArea }
  }, [walls, cutouts, openings, reserve, selectedPanel, vertical])
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
  const whatsappDraftUrl = draft ? whatsappCalculatorDraft(draft) : undefined
  const calculation = useMemo((): LeadCalculation | null => {
    if (!selectedPanel || !completed || res.openingArea === null || res.sheets > MAX_QTY) return null
    return {
      id: selectedPanel.id,
      walls: walls.map(({ length, height }) => ({
        length: Number(length.trim().replace(',', '.')),
        height: Number(height.trim().replace(',', '.')),
      })),
      openings: res.openingArea,
      reserve: Number(reserve.trim().replace(',', '.')),
      method: vertical ? 'vertical' : 'area',
    }
  }, [selectedPanel, completed, res.openingArea, res.sheets, walls, reserve, vertical])

  useEffect(() => report(id, { ...res, calculation }), [id, report, res, calculation])

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
        <div className="calc-grid">
          <motion.div className="calc-editor"
            initial={standalone ? false : { opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="modern-form">
              <div className="form-group">
                <label htmlFor={'calculator-material' + suffix}>Листовой материал</label>
                <StoreSelect id={'calculator-material' + suffix} label="Листовой материал" value={materialId} onChange={value => { onStart(); setMaterialId(value) }}>
                  <option value="">Выберите материал</option>
                  {sheetProducts.map(p => <option key={p.id} value={p.id}>{p.name} — {p.priceRub.toLocaleString('ru-RU')} ₽/{p.unit}</option>)}
                </StoreSelect>
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
              {!vertical && <div className="calc-walls">
                {cutouts.map((cutout, index) => <fieldset key={cutout.id} className="calc-wall">
                  <legend>Окно или дверь {index + 1}</legend>
                  {input(cutout.length, value => setCutouts(previous => previous.map(opening =>
                    opening.id === cutout.id ? { ...opening, length: value } : opening)), 'Ширина проёма ' + (index + 1), 'м')}
                  {input(cutout.height, value => setCutouts(previous => previous.map(opening =>
                    opening.id === cutout.id ? { ...opening, height: value } : opening)), 'Высота проёма ' + (index + 1), 'м')}
                  <button type="button" className="secondary-action calc-remove-wall"
                    onClick={() => setCutouts(previous => previous.filter(opening => opening.id !== cutout.id))}>
                    <X size={14} aria-hidden="true" /> Убрать проём {index + 1}
                  </button>
                </fieldset>)}
                <button type="button" className="secondary-action" disabled={cutouts.length >= 20} onClick={() => {
                  const id = nextCutout.current++
                  setCutouts(previous => [...previous, { id, length: '', height: '' }])
                }}><Plus size={16} aria-hidden="true" /> Добавить окно или дверь</button>
              </div>}
              <div className="calc-adjustments">
              {!vertical && input(openings, setOpenings, cutouts.length > 0 ? 'Площадь остальных проёмов' : 'Общая площадь проёмов', 'м²')}
              {input(reserve, setReserve, 'Запас на подрезку', '%')}
              </div>
              <div className="form-group">
                <label htmlFor={'calculator-method' + suffix}>Способ оценки</label>
                <StoreSelect id={'calculator-method' + suffix} label="Способ оценки" value={vertical ? 'vertical' : 'area'}
                  onChange={value => { onStart(); setVertical(value === 'vertical') }}>
                  <option value="area">По площади с вычетом проёмов</option>
                  <option value="vertical">По вертикальной раскладке</option>
                </StoreSelect>
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
                {res.panel && calculation && (
                  <LeadAction intent="calculation" className="secondary-action" details={{ calculation: [calculation] }}
                    context={[res.panel.name, res.panel.sku && res.panel.sku !== res.panel.name ? 'Артикул: ' + res.panel.sku : '',
                      res.sheets + ' лист.', price.toLocaleString('ru-RU') + ' ₽', method, 'Запас: ' + reserve + '%'].filter(Boolean).join(' · ')}>
                    Отправить расчёт в заявку
                  </LeadAction>
                )}
                <SocialContacts placement="product" base={base}
                  drafts={telegramDraftUrl ? { telegram: telegramDraftUrl, whatsapp: whatsappDraftUrl } : undefined} />
              </div>
            </div>
          </motion.div>
        </div>
  )
}
