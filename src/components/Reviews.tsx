import { avitoProfile } from '../lib/avitoProfile'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, ExternalLink, Star } from 'lucide-react'
import { loadAvitoSnapshot, type AvitoSnapshot } from '../lib/avitoReviews'

const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Moscow' })
const reviewPlural = new Intl.PluralRules('ru-RU')
const reviewNoun = (count: number) => ({ zero: 'отзывов', one: 'отзыв', two: 'отзыва', few: 'отзыва', many: 'отзывов', other: 'отзыва' })[reviewPlural.select(count)]

export function Reviews() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [snapshot, setSnapshot] = useState<AvitoSnapshot | null>(null)

  useEffect(() => {
    let active = true
    loadAvitoSnapshot().then((value) => { if (active) setSnapshot(value) })
    return () => { active = false }
  }, [])


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
              {snapshot
                ? `Отзывы из профиля на Авито. Данные на ${dateFormatter.format(new Date(snapshot.updatedAt))}.`
                : 'Смотрите отзывы покупателей в профиле ДЕКОРАЙ на Авито.'}
            </p>
            {avitoProfile && (<a className="reviews-avito-link interactive" href={avitoProfile} target="_blank" rel="noreferrer">
              Открыть профиль на Авито <ExternalLink size={15} />
            </a>)}
          </div>
        </div>


        {snapshot && (
          <motion.div
            className="reviews-carousel"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="reviews-controls" aria-label="Управление каруселью отзывов">
              <div className="reviews-summary">
                <Star size={19} fill="currentColor" aria-hidden="true" />
                <strong>{snapshot.rating.toFixed(1).replace('.', ',')}</strong>
                <span>из 5 · {snapshot.reviewsCount} {reviewNoun(snapshot.reviewsCount)} на Авито</span>
              </div>
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
              {snapshot.reviews.map((review, index) => (
                <article className="review-card" key={`${review.createdAt}-${index}`}>
                  <div className={`review-avatar avatar-${index % 5}`} aria-hidden="true">★</div>
                  <div className="review-topline">
                    <div>
                      <strong>Отзыв на Авито</strong>
                      <span><time dateTime={review.createdAt}>{dateFormatter.format(new Date(review.createdAt))}</time></span>
                    </div>
                    <div className="review-rating" aria-label={`Оценка ${review.rating} из 5`}>
                      {Array.from({ length: 5 }).map((_, star) => (
                        <Star key={star} size={14} fill={star < review.rating ? 'currentColor' : 'transparent'}
                          strokeWidth={1.8} className={star < review.rating ? '' : 'muted'} />
                      ))}
                    </div>
                  </div>
                  <p className="review-text">«{review.text}»</p>
                  {avitoProfile && (<a className="review-source" href={avitoProfile} target="_blank" rel="noreferrer">
                    Открыть профиль на Авито <ExternalLink size={12} />
                  </a>)}
                </article>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}
