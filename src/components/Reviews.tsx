import { useRef } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, ExternalLink, Star } from 'lucide-react'
import { CONTACTS } from '../data/products'

const reviews = [
  {
    name: 'Алексей',
    date: '2 августа',
    role: 'Клиент',
    rating: 5,
    listing: 'Монтаж стеновых бамбуковых панелей',
    text: 'Панели качественные. Спасибо.',
  },
  {
    name: 'RUSSSO BRAND',
    date: '29 июля',
    role: 'Покупатель',
    rating: 5,
    listing: 'Бамбуковые стеновые панели',
    text: 'Все отлично, панели супер, в магазине помогли определиться с выбором. Рекомендую ❤️',
  },
  {
    name: 'Елизавета',
    date: '19 июля',
    role: 'Покупатель',
    rating: 5,
    listing: 'Бамбуковые стеновые панели под дерево',
    text: 'Недавно приобрела бамбуковые панели и соединительный профиль — осталась очень довольна! Материал качественный, смотрится стильно и натурально, отлично подошёл для отделки. Огромный ассортимент панелей и профилей! Огромное спасибо менеджеру Никите — он настоящий профессионал: терпеливо всё рассказывал, ничего не навязывал, подбирал именно то, что нужно. Никита был на связи на каждом этапе, а в день покупки ещё и помог с упаковкой и загрузкой в машину — это очень выручило. Приятно, когда к клиенту относятся с таким вниманием. Обязательно буду рекомендовать вашу компанию!',
  },
  {
    name: 'Андрей',
    date: '9 июля',
    role: 'Покупатель',
    rating: 5,
    listing: 'Бамбуковые стеновые панели',
    text: 'Рекомендую! Купили у ребят 40 панелей на квартиру, смотрятся потрясающе, но мы ещё в процессе ремонта. Эффект вау обеспечен! Спасибо вам 😊',
  },
  {
    name: 'Юлия',
    date: '1 июля',
    role: 'Покупатель',
    rating: 5,
    listing: 'Бамбуковые стеновые панели',
    text: 'Удобное расположение офиса, есть стоянка. Панели в наличии, можно под заказ. Залазят в лифт. Тут лучшая цена. Продавец терпеливый и внимательный. Рекомендую 👍',
  },
  {
    name: 'Сергей',
    date: '18 июня',
    role: 'Клиент',
    rating: 5,
    listing: 'Монтаж стеновых бамбуковых панелей',
    text: 'Отличная компания! Не просто шоурум с образцами панелей, а целый склад, где можно подобрать панели и сразу купить. Хорошая цена. Организовали доставку и монтаж! Рекомендую!',
  },
  {
    name: 'Елена',
    date: '12 июня',
    role: 'Покупатель',
    rating: 5,
    listing: 'Стильные стеновые панели от производителя',
    text: 'Удивительно, очень быстро определились, продавец очень внимательный, подсказал как лучше. Совет — на первом этаже нужна табличка, не понятно куда.',
  },
  {
    name: 'Екатерина Ена',
    date: '10 июня',
    role: 'Покупатель',
    rating: 5,
    listing: 'Стеновые бамбуковые панели',
    text: 'Отличное обслуживание и качество товара. Всё супер. Рекомендую продавца!',
  },
  {
    name: 'Роман',
    date: '27 мая',
    role: 'Покупатель',
    rating: 4,
    listing: 'Бамбуковые стеновые панели для квартиры',
    text: 'Общительный продавец! Заранее не предупредили про необходимое мне количество нужных панелей. В итоге выбрал день, приехал в офис, а светлых панелей с фактурой дерева в наличии всего по 2 листа. Прежде чем ехать — обязательно созванивайтесь и всё уточняйте.',
  },
  {
    name: 'Ольга Попова',
    date: '21 мая',
    role: 'Покупатель',
    rating: 5,
    listing: 'Бамбуковые стеновые панели металл',
    text: 'Показали не кусок, а панель большую. Сразу видно цвет и фактура в массе. Вежливый продавец. Оперативно доставили, помогли с разгрузкой. Спасибо. Жду новое поступление под лён.',
  },
  {
    name: 'Инна',
    date: '5 мая',
    role: 'Покупатель',
    rating: 5,
    listing: 'Стеновые панели из бамбука под дерево',
    text: 'Всё оперативно и компетентно.',
  },
  {
    name: 'Vohid Subonkulov',
    date: '17 апреля',
    role: 'Покупатель',
    rating: 5,
    listing: 'Стеновые панели из бамбука',
    text: 'Очень грамотный человек и порядочных.',
  },
] as const

export function Reviews() {
  const trackRef = useRef<HTMLDivElement>(null)

  const move = (direction: 1 | -1) => {
    const track = trackRef.current
    const card = track?.querySelector<HTMLElement>('.review-card')
    if (!track || !card) return
    const gap = Number.parseFloat(getComputedStyle(track).gap) || 0
    track.scrollBy({ left: direction * (card.offsetWidth + gap), behavior: 'smooth' })
  }

  return (
    <section className="section reviews" id="reviews">
      <div className="container">
        <div className="section-head-flex reviews-head">
          <div>
            <p className="eyebrow">Отзывы</p>
            <h2>Что говорят<br />клиенты</h2>
          </div>
          <div className="reviews-head-side">
            <p className="lead">
              Реальные отзывы покупателей и клиентов Домэра
              с подтверждённой сделкой на Авито.
            </p>
            <a className="reviews-avito-link interactive" href={CONTACTS.avito} target="_blank" rel="noreferrer">
              Все отзывы на Авито <ExternalLink size={15} />
            </a>
          </div>
        </div>

        <motion.div
          className="reviews-carousel"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="reviews-controls" aria-label="Управление каруселью отзывов">
            <div className="reviews-arrows">
              <button type="button" onClick={() => move(-1)} aria-label="Предыдущий отзыв">
                <ChevronLeft size={18} />
              </button>
              <button type="button" onClick={() => move(1)} aria-label="Следующий отзыв">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="reviews-track" ref={trackRef}>
            {reviews.map((review, index) => (
              <article className="review-card" key={`${review.name}-${review.date}`}>
                <div className={`review-avatar avatar-${index % 5}`} aria-hidden="true">
                  {review.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="review-topline">
                  <div>
                    <strong>{review.name}</strong>
                    <span>{review.date} · {review.role}</span>
                  </div>
                  <div className="review-rating" aria-label={`Оценка ${review.rating} из 5`}>
                    {Array.from({ length: 5 }).map((_, star) => (
                      <Star
                        key={star}
                        size={14}
                        fill={star < review.rating ? 'currentColor' : 'transparent'}
                        strokeWidth={1.8}
                        className={star < review.rating ? '' : 'muted'}
                      />
                    ))}
                  </div>
                </div>
                <p className="review-deal">Сделка состоялась · {review.listing}</p>
                <p className="review-text">«{review.text}»</p>
                <a className="review-source" href={CONTACTS.avito} target="_blank" rel="noreferrer">
                  Отзыв с Авито <ExternalLink size={12} />
                </a>
              </article>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
