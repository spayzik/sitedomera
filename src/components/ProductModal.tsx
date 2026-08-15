import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { collections, products, type Product } from '../data/products'
import { useCart } from '../context/CartContext'
import { X } from 'lucide-react'

export function ProductModal({
  selected,
  closelyRelated = products,
  onSelect,
  onClose,
}: {
  selected: Product | null
  closelyRelated?: Product[]
  onSelect?: (p: Product) => void
  onClose: () => void
}) {
  const { add } = useCart()

  const similarProducts = useMemo(() => {
    if (!selected) return []
    const pool = closelyRelated.length ? closelyRelated : products
    return pool.filter(p => p.collection === selected.collection)
  }, [selected, closelyRelated])

  return (
    <AnimatePresence>
      {selected && (
        <motion.div
          className="gocek-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            className="gocek-box"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <img src={selected.image} alt={selected.name} className="gocek-bg" />
            <div className="gocek-gradient" />

            <div className="gocek-content">
              {/* Top Left: Title & Description */}
              <motion.div
                className="gocek-top-left"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              >
                <h2>{selected.name}</h2>
                <p>
                  {selected.description || 'Экологичная панель премиум-класса с точной имитацией натуральной фактуры.'}
                </p>
                <div className="gocek-price-pill">
                  {selected.price.toLocaleString('ru-RU')} ₽
                </div>
              </motion.div>

              {/* Top Right: Glassmorphism Specs */}
              <motion.div
                className="gocek-top-right gocek-glass"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="gocek-glass-header">
                  <h3>Детали материала</h3>
                  <button onClick={onClose} aria-label="Закрыть">
                    <X size={20} />
                  </button>
                </div>

                <div className="gocek-glass-list">
                  {[
                    ['Коллекция', collections.find(c => c.id === selected.collection)?.name || ''],
                    ['Артикул', selected.sku],
                    ['Размеры', selected.size],
                    ['Толщина', selected.thickness],
                    ['Основа', 'WPC (Бамбук-полимер)'],
                  ].map(([label, value]) => (
                    <div className="gocek-row" key={label}>
                      <span>{label}</span>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>

                <button
                  className="gocek-tech-btn"
                  onClick={() => {
                    add(selected)
                    onClose()
                  }}
                >
                  <span>ДОБАВИТЬ В ЗАКАЗ</span>
                  <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>+</span>
                </button>
              </motion.div>

              {/* Bottom Dock Thumbnails */}
              <motion.div
                className="gocek-dock"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                {similarProducts.map(p => {
                  const isActive = p.id === selected.id
                  return (
                    <motion.button
                      key={p.id}
                      className={`gocek-dock-item ${isActive ? 'active' : ''}`}
                      onClick={() => onSelect?.(p)}
                      whileHover={{ scale: 1.05, y: -4 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    >
                      <img src={p.image} alt={p.name} />
                      {isActive && <span>{p.name}</span>}
                    </motion.button>
                  )
                })}
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}