import { useState, type FormEvent } from 'react'
import { CONTACTS } from '../data/products'
import { sendLead } from '../lib/telegram'
import { useCart } from '../context/CartContext'
import { PhoneInput } from './PhoneInput'
import { motion } from 'framer-motion'

export function Contacts() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const { items, total } = useCart()

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatus('loading')
    const fd = new FormData(e.currentTarget)
    const res = await sendLead({
      type: items.length ? 'order' : 'contact',
      name: String(fd.get('name') || ''),
      phone: String(fd.get('phone') || ''),
      message: String(fd.get('message') || ''),
      cart: items,
    })
    if (res.ok) {
      setStatus('ok')
      e.currentTarget.reset()
    } else if (res.fallback) {
      window.open(res.fallback, '_blank')
      setStatus('ok')
    } else setStatus('err')
  }

  return (
    <section className="section contacts" id="contacts">
      <div className="container">
        <div className="split-grid">

          <motion.div
            className="split-content"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="eyebrow">Контакты</p>
            <h2>Свяжитесь<br/>с нами</h2>
            <p className="lead" style={{ marginBottom: '4rem' }}>
              Готовы ответить на вопросы, рассчитать логистику
              и помочь с оформлением заказа.
            </p>

            <div className="info-blocks">
              <a className="info-item" href={`tel:${CONTACTS.phoneRaw}`} style={{ display: 'block', textDecoration: 'none' }}>
                <strong style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>{CONTACTS.phone}</strong>
                <span>Официальный отдел продаж</span>
              </a>
              <a className="info-item" href={CONTACTS.avito} target="_blank" rel="noreferrer" style={{ display: 'block', textDecoration: 'none' }}>
                <strong style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>Магазин на Авито</strong>
                <span>Отзывы и дополнительный ассортимент</span>
              </a>
            </div>
          </motion.div>

          <motion.div
            className="split-form"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', marginBottom: '1rem' }}>Оставить заявку</h3>
            
            {items.length > 0 ? (
              <p style={{ marginBottom: '3rem', color: 'var(--accent)', fontSize: '0.9rem' }}>
                В корзине {items.length} поз. на {total.toLocaleString('ru-RU')} ₽
              </p>
            ) : (
              <p style={{ color: 'var(--muted)', marginBottom: '3rem', fontSize: '0.9rem' }}>
                Прямая связь с менеджерами.
              </p>
            )}

            <form className="modern-form" onSubmit={onSubmit}>
              <div className="form-group">
                <input name="name" required placeholder="ВАШЕ ИМЯ" />
              </div>
              <div className="form-group">
                <PhoneInput required placeholder="+7 (___) ___-__-__" />
              </div>
              <div className="form-group">
                <textarea name="message" rows={2} placeholder="ДЕТАЛИ ЗАКАЗА ИЛИ ВОПРОС" />
              </div>

              <div className="form-group">
                <label className="consent">
                  <input type="checkbox" required />
                  <span>Соглашаюсь с <a href="#/privacy" onClick={(e) => e.stopPropagation()}>политикой конфиденциальности</a> и <a href="#/offer" onClick={(e) => e.stopPropagation()}>офертой</a></span>
                </label>
              </div>

              <button className="btn btn-primary btn-full" type="submit" disabled={status === 'loading'} style={{ marginTop: '1rem' }}>
                {status === 'loading' ? 'ОТПРАВКА...' : 'ОТПРАВИТЬ ЗАЯВКУ'}
              </button>

              {status === 'ok' && <p className="status-msg ok">Спасибо! Заявка отправлена.</p>}
              {status === 'err' && <p className="status-msg err">Ошибка отправки. Позвоните нам.</p>}
            </form>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
