import { useCart } from '../context/CartContext'
import { ShoppingBag } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function FloatingCart() {
  const { count, total, setOpen } = useCart()

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.button
          className="floating-cart"
          onClick={() => setOpen(true)}
          initial={{ x: '-50%', y: 80, opacity: 0 }}
          animate={{ x: '-50%', y: 0, opacity: 1 }}
          exit={{ x: '-50%', y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 220 }}
          aria-label="Открыть корзину"
        >
          <span className="floating-cart-icon">
            <ShoppingBag size={18} />
            <span className="floating-cart-badge">{count}</span>
          </span>
          <span className="floating-cart-text">
            <strong>{total.toLocaleString('ru-RU')} ₽</strong>
            <small>Открыть подборку</small>
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
