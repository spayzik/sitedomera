import { CONTACTS } from '../data/products'
import { useCart } from '../context/CartContext'
import { motion } from 'framer-motion'
import { ArrowUpRight, Phone } from 'lucide-react'
import { useState } from 'react'

const mapSrc = `https://yandex.ru/map-widget/v1/?text=${encodeURIComponent(CONTACTS.address)}&z=16`
const mapDir = `https://yandex.ru/maps/?text=${encodeURIComponent(CONTACTS.address)}`

export function Showroom() {
  const { items, total } = useCart()
  const [showMap, setShowMap] = useState(false)

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
              и помочь с выбором материалов. В шоуруме ждём без записи —
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
              <a className="info-item" href={CONTACTS.telegram} target="_blank" rel="noreferrer" style={{ display: 'block', textDecoration: 'none' }}>
                <strong style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>Написать в Telegram</strong>
                <span>Пишите — отвечаем в течение дня</span>
              </a>
              <a className="info-item" href={CONTACTS.telegramChannel} target="_blank" rel="noreferrer" style={{ display: 'block', textDecoration: 'none' }}>
                <strong style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>Телеграм-канал: @domerarf</strong>
                <span>Новинки коллекций и фото в интерьерах</span>
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
            <p className="eyebrow">На связи</p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', marginBottom: '1rem' }}>Обсудим ваш проект</h3>
            <p className="contact-panel-copy">
              Расскажите менеджеру о задаче напрямую в Telegram — поможем выбрать фактуру,
              уточнить наличие и рассчитать материалы.
            </p>

            {items.length > 0 && (
              <p className="contact-selection">
                В вашей подборке {items.length} поз. на {total.toLocaleString('ru-RU')} ₽
              </p>
            )}

            <div className="contact-panel-actions">
              <a className="btn btn-primary btn-full interactive" href={CONTACTS.telegram} target="_blank" rel="noreferrer">
                Написать в Telegram <ArrowUpRight size={16} />
              </a>
              <a className="btn btn-white btn-full interactive" href={CONTACTS.avito} target="_blank" rel="noreferrer">
                Открыть магазин на Авито <ArrowUpRight size={16} />
              </a>
            </div>
            <a className="contact-panel-phone interactive" href={`tel:${CONTACTS.phoneRaw}`}>
              <Phone size={18} /> {CONTACTS.phone}
            </a>
            <p className="contact-panel-note">Подборка останется в этом браузере; мы увидим её, только если вы сами расскажете о ней.</p>
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
            {showMap ? (
              <iframe
                src={mapSrc}
                title="Склад и шоурум Домэра на карте"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : <div className="map-placeholder" aria-hidden="true" />}
          </div>
          <div className="map-card">
            <p className="eyebrow">Как добраться</p>
            <h3>{CONTACTS.address}</h3>
            <p>Склад и шоурум — {CONTACTS.hours.toLowerCase()}.</p>
            <div className="map-actions">
              {!showMap && <button className="btn btn-primary interactive" type="button" onClick={() => setShowMap(true)}>Показать карту</button>}
              <a className="btn btn-white interactive" href={mapDir} target="_blank" rel="noreferrer">Построить маршрут</a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
