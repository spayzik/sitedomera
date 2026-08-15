import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { products, collections, type Product } from '../data/products'
import { useCart } from '../context/CartContext'
import { ArrowRight, RotateCcw, Check } from 'lucide-react'

const Q = [
  {
    key: 'room',
    q: 'Какое помещение будем оформлять?',
    options: [
      { id: 'living', label: 'Гостиная', sub: 'ТВ-зона и акцентная стена' },
      { id: 'bedroom', label: 'Спальня', sub: 'Изголовье, уют' },
      { id: 'hallway', label: 'Прихожая', sub: 'Проходимая зона' },
      { id: 'office', label: 'Офис и коммерция', sub: 'Ресепшн, кафе, салоны' },
    ],
  },
  {
    key: 'style',
    q: 'Какое настроение ближе?',
    options: [
      { id: 'cozy', label: 'Тёплый уют', sub: 'Натуральное дерево, мягкость' },
      { id: 'minimal', label: 'Минимализм', sub: 'Чисто, тихо, благородно' },
      { id: 'metal', label: 'Металл и лофт', sub: 'Холодный блеск, характер' },
      { id: 'decor', label: 'Декор 3D', sub: 'Объём и перламутр' },
    ],
  },
  {
    key: 'budget',
    q: 'Сколько планируете выделить?',
    options: [
      { id: 'basic', label: 'До 60 000 ₽', sub: 'Акцентная стена' },
      { id: 'mid', label: '60–120 000 ₽', sub: 'Комната целиком' },
      { id: 'premium', label: 'От 120 000 ₽', sub: 'Несколько комнат / объект' },
    ],
  },
] as const

type Answer = { room: string; style: string; budget: string }

const REC: Record<string, Record<string, string>> = {
  living: { cozy: '919-4', minimal: 'C807601-36', metal: '006-2', decor: 'ryab-3d' },
  bedroom: { cozy: 'JGFG-022', minimal: '962-1', metal: '013-A229', decor: '002-A235' },
  hallway: { cozy: '002-A235', minimal: '013-A229', metal: '006-2', decor: 'ryab-3d' },
  office: { cozy: '919-4', minimal: '013-A229', metal: '006-2', decor: 'ryab-3d' },
}

export function Quiz() {
  const { add } = useCart()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Partial<Answer>>({})

  const done = step >= Q.length

  const product: Product = useMemo(() => {
    if (!done) return products[0]
    const room = answers.room ?? 'living'
    const style = answers.style ?? 'cozy'
    const id = REC[room]?.[style] ?? '919-4'
    return products.find((p) => p.id === id) ?? products[0]
  }, [done, answers])

  const pick = (id: string) => {
    const key = Q[step].key
    const next = { ...answers, [key]: id }
    setAnswers(next)
    if (step < Q.length - 1) setStep(step + 1)
    else setStep(Q.length)
  }

  const restart = () => {
    setStep(0)
    setAnswers({})
  }

  const collection = collections.find((c) => c.id === product.collection)?.name

  return (
    <section className="section quiz" id="quiz">
      <div className="container">
        <div className="catalog-header" style={{ marginBottom: '3rem' }}>
          <div>
            <p className="eyebrow">Подбор</p>
            <h2>Найдём вашу<br/>фактуру</h2>
          </div>
          <p className="lead">
            Три коротких вопроса — и мы покажем материал, который
            подойдёт вашему интерьеру.
          </p>
        </div>

        <div className="quiz-box">
          <div className="quiz-progress">
            <div className="quiz-progress-bar" style={{ width: `${(done ? Q.length : step) / Q.length * 100}%` }} />
          </div>

          <AnimatePresence mode="wait">
            {!done ? (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="eyebrow">Вопрос {step + 1} / {Q.length}</p>
                <h3 className="quiz-q">{Q[step].q}</h3>
                <div className="quiz-options">
                  {Q[step].options.map((o) => (
                    <button
                      key={o.id}
                      className="quiz-opt interactive"
                      onClick={() => pick(o.id)}
                    >
                      <span className="quiz-opt-label">{o.label}</span>
                      <span className="quiz-opt-sub">{o.sub}</span>
                      <ArrowRight size={18} className="quiz-opt-arrow" />
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="quiz-result"
              >
                <div className="quiz-result-img">
                  <img src={product.image} alt={product.name} />
                  <span className="quiz-result-tag">{collection}</span>
                </div>
                <div className="quiz-result-info">
                  <p className="eyebrow" style={{ margin: 0 }}>Ваш материал</p>
                  <h3>{product.name}</h3>
                  <p className="quiz-result-sku">{product.sku} · {product.size}</p>
                  <p className="quiz-result-desc">{product.description}</p>
                  <div className="quiz-result-price">{product.price.toLocaleString('ru-RU')} ₽ <span>/ {product.unit}</span></div>
                  <div className="quiz-result-actions">
                    <button className="btn btn-primary interactive" onClick={() => add(product)}>
                      Добавить в заказ <Check size={16} />
                    </button>
                    <button className="btn btn-white interactive" onClick={restart}>
                      Пройти заново <RotateCcw size={16} />
                    </button>
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