import { useState, type FormEvent } from 'react'
import { CONTACTS } from '../data/products'
import { sendLead } from '../lib/telegram'
import { PhoneInput } from './PhoneInput'
import { useCart } from '../context/CartContext'
import { motion } from 'framer-motion'

const mapSrc = `https://yandex.ru/map-widget/v1/?text=${encodeURIComponent(CONTACTS.address)}&z=16`
const mapDir = `https://yandex.ru/maps/?text=${encodeURIComponent(CONTACTS.address)}`

export function Showroom() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const { items, total } = useCart()

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatus('loading')
    const fd = new FormData(e.currentTarget)
    const res = await sendLead({
      type: items.length ? 'order' : 'showroom',
      name: String(fd.get('name') || ''),
      phone: String(fd.get('phone') || ''),
      message: String(fd.get('note') || ''),
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
    <section className="section showroom" id="showroom">
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
            <p className="lead" style={{ marginBottom: '3rem' }}>
              Готовы ответить на вопросы, рассчитать логистику
              и помочь с оформлением заказа. В шоуруме ждём без записи —
              все фактуры в наличии на складе.
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
              {[
                { title: CONTACTS.address, sub: 'Ждем вас без записи' },
                { title: CONTACTS.hours, sub: 'Ежедневно и без выходных' },
              ].map((item) => (
                <div className="info-item" key={item.title}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="split-form"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', marginBottom: '1rem' }}>Рассчитать материалы</h3>
            <p style={{ color: 'var(--muted)', marginBottom: '3rem', fontSize: '0.9rem' }}>
              Оставьте контакты, и мы сделаем точный расчёт панелей и профилей под ваш проект.
            </p>

            {items.length > 0 && (
              <p style={{ marginBottom: '3rem', color: 'var(--accent)', fontSize: '0.9rem' }}>
                В корзине {items.length} поз. на {total.toLocaleString('ru-RU')} ₽
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
                <textarea name="note" rows={2} placeholder="КАКОЙ ОБЪЕМ ИЛИ ПЛОЩАДЬ НУЖНА? (ОПЦИОНАЛЬНО)" />
              </div>

              <div className="form-group">
                <label className="consent">
                  <input type="checkbox" required />
                  <span>Соглашаюсь с <a href="#/privacy" onClick={(e) => e.stopPropagation()}>политикой конфиденциальности</a> и <a href="#/offer" onClick={(e) => e.stopPropagation()}>офертой</a></span>
                </label>
              </div>

              <button className="btn btn-primary btn-full interactive" type="submit" disabled={status === 'loading'} style={{ marginTop: '1rem' }}>
                {status === 'loading' ? 'ОТПРАВКА...' : 'ОСТАВИТЬ ЗАЯВКУ'}
              </button>

              {status === 'ok' && <p className="status-msg ok">Заявка успешно отправлена!</p>}
              {status === 'err' && <p className="status-msg err">Ошибка. Пожалуйста, позвоните нам.</p>}
            </form>
          </motion.div>

        </div>

        <motion.div
          className="map-block"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="map-frame">
            <iframe
              src={mapSrc}
              title="Склад и шоурум Домэра на карте"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
          <div className="map-card">
            <p className="eyebrow">Как добраться</p>
            <h3>{CONTACTS.address}</h3>
            <p>Склад и шоурум — без записи, ежедневно {CONTACTS.hours.replace('Ежедневно ', '')}.</p>
            <a className="btn btn-white interactive" href={mapDir} target="_blank" rel="noreferrer">
              Построить маршрут
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}