import { inquiryWhatsAppLink } from '../lib/contactLinks'
import { productPath } from '../data/seoPaths'
import { LeadAction } from './LeadProvider'
import { SocialContacts } from './SocialContacts'
import { ProductEstimate } from './ProductEstimate'
import { sheetArea } from '../lib/calculator'
import { SheetUnitPrice } from './SheetUnitPrice'
import { StockAvailability } from './StockAvailability'
import { useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { collections, products, CONTACTS, type Product, productDetails } from '../data/products'
import { useCart } from '../context/CartContext'
import { X } from 'lucide-react'
import { buildTelegramDraftUrl, formatProductTelegramMessage } from '../lib/telegramLink'
import { useDialog } from '../lib/useDialog'
import { productDescription } from '../lib/productPresentation'
import { trackAnalyticsGoal } from '../lib/analytics'

export function ProductModal({
  selected,
  base = import.meta.env.BASE_URL,
  closelyRelated = products,
  onSelect,
  onClose,
}: {
  selected: Product | null
  base?: string
  closelyRelated?: Product[]
  onSelect?: (p: Product) => void
  onClose: () => void
}) {
  const { add } = useCart()
  const dialogRef = useDialog(Boolean(selected), onClose)
  const productId = selected?.id
  const lastViewed = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (productId === lastViewed.current) return
    lastViewed.current = productId
    if (productId) trackAnalyticsGoal('product_view')
  }, [productId])

  const similarProducts = useMemo(() => {
    if (!selected) return []
    const pool = closelyRelated.length ? closelyRelated : products
    return pool.filter(p => p.categoryId === selected.categoryId)
  }, [selected, closelyRelated])

  const collection = selected ? collections.find(c => c.id === selected.categoryId)?.name ?? '' : ''
  const telegramDraftUrl = selected
    ? buildTelegramDraftUrl(CONTACTS.telegram, formatProductTelegramMessage(selected, collection))
    : undefined

  const whatsapp = selected ? inquiryWhatsAppLink("consultation", selected.name + (selected.sku && selected.sku !== selected.name ? " · Артикул " + selected.sku : "")) : undefined

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
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={selected.name}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <img className="gocek-material-backdrop" src={base + selected.image}
              alt="" aria-hidden="true" decoding="async" />
            <div className="gocek-gradient" aria-hidden="true" />
            <button className="gocek-close-mobile icon-btn" onClick={onClose} aria-label="Закрыть карточку">
              <X size={20} />
            </button>

            <div className="gocek-content">
              {/* Top Left: Title & Description */}
              <motion.div
                className="gocek-top-left"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              >
                <h2>{selected.name}</h2>
                {selected.sku && selected.sku !== selected.name && <p className="gocek-sku">Артикул {selected.sku}</p>}
                <p>
                  {productDescription(selected)}
                </p>
                <div className="gocek-price-pill">
                  {selected.priceRub.toLocaleString('ru-RU')} ₽/{selected.unit}
                </div>
                <SheetUnitPrice product={selected} />
                <StockAvailability productId={selected.id} details />
                {sheetArea(selected) > 0 && <ProductEstimate key={selected.id} product={selected} calculatorBase={base} />}
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
                  {productDetails(selected).map(([label, value]) => (
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
                  <span>ДОБАВИТЬ В ПОДБОРКУ</span>
                  <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>+</span>
                </button>
                <LeadAction intent="samples" context={selected.name + (selected.sku ? ' · Артикул ' + selected.sku : '') + ' · 1 образец'} className="gocek-telegram-link">Запросить образец</LeadAction>
                <a className="gocek-telegram-link" href={base + productPath(selected).slice(1)}>Страница материала</a>
                {telegramDraftUrl && <div className="gocek-contact">
                  <p>Связаться с менеджером</p>
                  <SocialContacts placement="product" base={base}
                    drafts={{ telegram: telegramDraftUrl, whatsapp }} />
                </div>}
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
                      <img src={base + p.image} alt={p.name} />
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
