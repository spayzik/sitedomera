import { useCart } from '../context/CartContext'
import { X, Minus, Plus, Trash2, ArrowRight } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { sendLead } from '../lib/telegram'
import { CONTACTS } from '../data/products'
import { PhoneInput } from './PhoneInput'
import { AnimatePresence, motion } from 'framer-motion'

export function CartDrawer() {
  const { open, setOpen, items, total, setQty, remove, clear } = useCart()
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const [fallback, setFallback] = useState<{ tg?: string; tel?: string }>({})

  const onOrder = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!items.length) return
    setStatus('loading')
    const fd = new FormData(e.currentTarget)
    const res = await sendLead({
      type: 'order',
      name: String(fd.get('name') || ''),
      phone: String(fd.get('phone') || ''),
      message: String(fd.get('message') || ''),
      cart: items,
    })
    if (res.ok) {
      setStatus('ok')
      clear()
    } else {
      // Заявка не ушла — даём человеку прямые контакты, корзину не чистим
      setFallback({ tg: res.tg, tel: res.tel })
      setStatus('err')
    }
  }

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
          <motion.aside
            className="cart-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          >
            <div className="drawer-head">
              <h3>Ваш заказ</h3>
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
              <form className="modern-form" onSubmit={onOrder}>
                <div className="form-group">
                  <input name="name" required placeholder="Имя" disabled={!items.length} />
                </div>
                <div className="form-group">
                  <PhoneInput required disabled={!items.length} />
                </div>
                {status === 'err' && (
                  <p className="form-error">
                    Не удалось отправить заказ. Позвоните нам:{' '}
                    <a href={`tel:${fallback.tel}`}>{CONTACTS.phone}</a>
                    {' '}или напишите в{' '}
                    <a href={fallback.tg} target="_blank" rel="noreferrer">Telegram</a>.
                  </p>
                )}
                <button
                  className="btn btn-primary btn-full"
                  type="submit"
                  disabled={!items.length || status === 'loading'}
                >
                  {status === 'loading' ? 'Оформление...' : status === 'ok' ? 'Успешно!' : status === 'err' ? 'Повторить' : 'Оформить заказ'}
                  {(status === 'idle' || status === 'err') && items.length > 0 && <ArrowRight size={16} />}
                </button>
              </form>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
