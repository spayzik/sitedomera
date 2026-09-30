import { useCart } from '../context/CartContext'
import { X, Minus, Plus, Trash2, ArrowRight } from 'lucide-react'
import { CONTACTS } from '../data/products'
import { AnimatePresence, motion } from 'framer-motion'
import { buildTelegramDraftUrl, formatCartTelegramMessage } from '../lib/telegramLink'
import { useDialog } from '../lib/useDialog'

export function CartDrawer() {
  const { open, setOpen, items, total, setQty, remove } = useCart()
  const dialogRef = useDialog(open, () => setOpen(false))
  const telegramDraftUrl = items.length > 0
    ? buildTelegramDraftUrl(CONTACTS.telegram, formatCartTelegramMessage(items))
    : null

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setOpen(false)}
          />
          <motion.div
            className="cart-drawer"
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Ваша подборка"
            tabIndex={-1}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          >
            <div className="drawer-head">
              <h3>Ваша подборка</h3>
              <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Закрыть">
                <X size={20} />
              </button>
            </div>

            <div className="drawer-body">
              {!items.length && (
                <div className="empty-cart">
                  <p>Корзина пуста</p>
                  <span>Добавьте панели из каталога или примерки</span>
                </div>
              )}
              {items.map((i) => (
                <motion.div
                  className="cart-line"
                  key={i.product.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <img src={i.product.swatch} alt="" />
                  <div className="cart-info">
                    <strong>{i.product.name}</strong>
                    <span className="price">{i.product.price.toLocaleString('ru-RU')} ₽</span>
                    <div className="qty-controls">
                      <button onClick={() => setQty(i.product.id, i.qty - 1)} aria-label="Уменьшить">
                        <Minus size={14} />
                      </button>
                      <span>{i.qty}</span>
                      <button onClick={() => setQty(i.product.id, i.qty + 1)} aria-label="Увеличить">
                        <Plus size={14} />
                      </button>
                      <button className="del-btn" onClick={() => remove(i.product.id)} aria-label="Удалить">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="drawer-foot">
              <div className="total-row">
                <span>Итого</span>
                <strong>{total.toLocaleString('ru-RU')} ₽</strong>
              </div>
              <p className="drawer-contact-note">Подборка хранится в этом браузере и не отправляется автоматически.</p>
              <div className="drawer-contact-actions">
                {telegramDraftUrl && (
                  <a className="btn btn-primary btn-full interactive" href={telegramDraftUrl} target="_blank" rel="noreferrer">
                    Обсудить подборку в Telegram <ArrowRight size={16} />
                  </a>
                )}
                <a className="contact-inline-phone interactive" href={`tel:${CONTACTS.phoneRaw}`}>
                  Позвонить: {CONTACTS.phone}
                </a>
                <a className="contact-inline-phone interactive" href={CONTACTS.avito} target="_blank" rel="noreferrer">
                  Открыть магазин на Авито
                </a>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
