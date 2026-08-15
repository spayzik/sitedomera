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
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 220 }}
          aria-label="Открыть корзину"
        >
          <span className="floating-cart-icon">
            <ShoppingBag size={18} />
            <span className="floating-cart-badge">{count}</span>
          </span>
          <span className="floating-cart-text">
            <strong>{total.toLocaleString('ru-RU')} ₽</strong>
            <small>Перейти к заказу</small>
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  )
}