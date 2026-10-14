import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { products, collections, CONTACTS, formatDimensions, type CollectionId } from '../data/products'
import { useCart } from '../context/CartContext'
import { ArrowRight, RotateCcw, Check } from 'lucide-react'
import { buildTelegramDraftUrl, formatQuizTelegramMessage } from '../lib/telegramLink'
import { quizCategories } from '../lib/quiz'

const Q = [
  { q: 'Какое помещение будем оформлять?', options: [
    { id: 'living', label: 'Гостиная', sub: 'ТВ-зона и акцентная стена' },
    { id: 'bedroom', label: 'Спальня', sub: 'Изголовье, уют' },
    { id: 'hallway', label: 'Прихожая', sub: 'Проходимая зона' },
    { id: 'office', label: 'Офис и коммерция', sub: 'Ресепшн, кафе, салоны' },
  ] },
  { q: 'Какое настроение ближе?', options: [
    { id: 'cozy', label: 'Тёплый уют', sub: 'Дерево, ткань, софт-тач' },
    { id: 'minimal', label: 'Минимализм', sub: 'Спокойные поверхности' },
    { id: 'metal', label: 'Металл и лофт', sub: 'Металлические фактуры' },
    { id: 'stone', label: 'Фактура камня', sub: 'Гибкий камень и бамбук под камень' },
  ] },
] as const

export function Quiz() {
  const { add } = useCart()
  const [step, setStep] = useState(0)
  const [categoryIds, setCategoryIds] = useState<readonly CollectionId[]>([])
  const [categoryId, setCategoryId] = useState<CollectionId | null>(null)
  const [productId, setProductId] = useState('')
  const done = step >= Q.length
  const category = collections.find(c => c.id === categoryId)
  const candidates = products.filter(p => p.categoryId === categoryId)
  const product = candidates.find(p => p.id === productId) ?? null
  const draft = product && category ? buildTelegramDraftUrl(CONTACTS.telegram, formatQuizTelegramMessage(product, category.name)) : null

  function pick(id: string) {
    if (step === 1) {
      const ids = quizCategories[id]
      setCategoryIds(ids)
      setCategoryId(ids[0])
    }
    setStep(step + 1)
  }
  function restart() {
    setStep(0)
    setCategoryIds([])
    setCategoryId(null)
    setProductId('')
  }

  return (
    <section className="section quiz" id="quiz">
      <div className="container">
        <div className="catalog-header" style={{ marginBottom: '3rem' }}>
          <div><p className="eyebrow">Подбор</p><h2>Найдём вашу<br/>фактуру</h2></div>
          <p className="lead">Два коротких вопроса помогут выбрать категорию по стилю. Конкретный материал вы выберете сами; условия применения уточнит менеджер.</p>
        </div>
        <div className="quiz-box">
          <div className="quiz-progress"><div className="quiz-progress-bar" style={{ width: (step / Q.length * 100) + '%' }} /></div>
          <AnimatePresence mode="wait">
            {!done ? (
              <motion.div key={step} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.4 }}>
                <p className="eyebrow">Вопрос {step + 1} / {Q.length}</p>
                <h3 className="quiz-q">{Q[step].q}</h3>
                <div className="quiz-options">
                  {Q[step].options.map(o => <button key={o.id} className="quiz-opt interactive" onClick={() => pick(o.id)}>
                    <span className="quiz-opt-label">{o.label}</span><span className="quiz-opt-sub">{o.sub}</span><ArrowRight size={18} className="quiz-opt-arrow" />
                  </button>)}
                </div>
              </motion.div>
            ) : category && (
              <motion.div key="result" className="quiz-result" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
                <div className="quiz-result-img">
                  <img src={product?.image ?? category.banner} alt={product?.name ?? ('Пример фактуры: ' + category.name)} />
                  <span className="quiz-result-tag">{category.name}</span>
                </div>
                <div className="quiz-result-info">
                  <p className="eyebrow">Категории по вашему стилю</p>
                  <div className="quiz-category-choices">
                    {categoryIds.map(id => <button key={id} className="btn btn-outline" aria-pressed={id === categoryId} onClick={() => { setCategoryId(id); setProductId('') }}>{collections.find(c => c.id === id)!.name}</button>)}
                  </div>
                  <h3>{product?.name ?? category.name}</h3>
                  <p className="quiz-result-desc">Это подбор по внешнему виду, а не подтверждение пригодности для конкретного помещения. Выберите изделие, чтобы уточнить его у менеджера.</p>
                  <label className="form-group" htmlFor="quiz-material">Материал из категории</label>
                  <select className="catalog-select" id="quiz-material" value={productId} onChange={e => setProductId(e.target.value)}>
                    <option value="">Выберите материал</option>
                    {candidates.map(p => <option key={p.id} value={p.id}>{p.name} — {p.priceRub.toLocaleString('ru-RU')} ₽/{p.unit}</option>)}
                  </select>
                  {product && <>
                    <p className="quiz-result-sku">{product.sku ? product.sku + ' · ' : ''}{formatDimensions(product)}</p>
                    <div className="quiz-result-price">{product.priceRub.toLocaleString('ru-RU')} ₽ <span>/ {product.unit}</span></div>
                    {product.imageStatus === 'pdf_preview' && <p className="product-preview-note">Превью из PDF-каталога.</p>}
                  </>}
                  <div className="quiz-result-actions">
                    <button className="btn btn-primary interactive" disabled={!product} onClick={() => { if (product) add(product) }}>Добавить в подборку <Check size={16} /></button>
                    <button className="btn btn-white interactive" onClick={restart}>Пройти заново <RotateCcw size={16} /></button>
                  </div>
                  <div className="quiz-contact">
                    <p>Ответы остаются в браузере. В Telegram попадёт только выбранный материал; сообщение вы отправите сами.</p>
                    {draft && <a className="btn btn-outline interactive" href={draft} target="_blank" rel="noreferrer">Обсудить материал в Telegram <ArrowRight size={16} /></a>}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
