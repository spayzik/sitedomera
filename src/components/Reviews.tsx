import { motion } from 'framer-motion'
import { Star } from 'lucide-react'

const reviews = [
  {
    name: 'Мария',
    city: 'Москва',
    text: 'Заказывала дуб натуральный для гостиной. Сама сомневалась, какой оттенок — менеджер посоветовал, и не прогадали. Панели идеально ровные, приклеили за один день. Выглядит дороже, чем ожидала.',
    product: 'Дуб натуральный 919-4',
    photo: '/catalog/rooms/room-wood.jpg',
    rating: 5,
  },
  {
    name: 'Дмитрий',
    city: 'Химки',
    text: 'Взял soft-touch для спальни. Бархатная, тёплая стена — теперь это любимое место в квартире. Отгрузка в день заказа, самовывоз со склада без записи, всё чётко.',
    product: 'Песочный soft-touch',
    photo: '/catalog/hero/hero-soft-new.jpg',
    rating: 5,
  },
  {
    name: 'Анна',
    city: 'Долгопрудный',
    text: 'Делали ресепшн в салоне красоты — выбрали сталь шлифованную. Коллеги-клиенты думают, что это настоящий металл. Отличная геометрия стыков, монтаж быстрый.',
    product: 'Сталь шлифованная 006-2',
    photo: '/catalog/rooms/room-metal.jpg',
    rating: 5,
  },
]

export function Reviews() {
  return (
    <section className="section reviews" id="reviews">
      <div className="container">
        <div className="section-head-flex">
          <div>
            <p className="eyebrow">Отзывы</p>
            <h2>Что говорят<br/>клиенты</h2>
          </div>
          <p className="lead">
            Реальные проекты и мнения тех, кто уже
            закончил ремонт с панелями Домэра.
          </p>
        </div>

        <div className="reviews-grid">
          {reviews.map((r, i) => (
            <motion.article
              key={r.name}
              className="review-card"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.7, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="review-photo">
                <img src={r.photo} alt={`Проект клиента: ${r.product}`} loading="lazy" />
                <span className="review-stars">
                  {Array.from({ length: r.rating }).map((_, s) => (
                    <Star key={s} size={13} fill="var(--accent)" stroke="var(--accent)" />
                  ))}
                </span>
              </div>
              <div className="review-body">
                <p className="review-text">«{r.text}»</p>
                <div className="review-meta">
                  <div>
                    <strong>{r.name}</strong>
                    <span>{r.city}</span>
                  </div>
                  <span className="review-product">{r.product}</span>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}