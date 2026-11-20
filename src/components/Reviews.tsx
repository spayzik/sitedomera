import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Images, Maximize2, Star, UserRound, X } from 'lucide-react'
import { avitoProfile } from '../lib/avitoProfile'
import { featuredAvitoReviews, loadAvitoSnapshot, type AvitoSnapshot, type AvitoReview } from '../lib/avitoReviews'
import type { AvitoReviewPhoto } from '../lib/avitoReviewDetails'

const dateFormatter = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeZone: 'Europe/Moscow' })
const ratingFormatter = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const reviewPlural = new Intl.PluralRules('ru-RU')
const reviewNoun = (count: number) => ({ zero: 'отзывов', one: 'отзыв', two: 'отзыва', few: 'отзыва', many: 'отзывов', other: 'отзыва' })[reviewPlural.select(count)]
const initialCount = 3

function ReviewAvatar({ review }: { review: AvitoReview }) {
  const [failedUrl, setFailedUrl] = useState<string>()
  const { avatarUrl, displayName } = review
  const initials = displayName?.split(' ').map(word => Array.from(word)[0]).join('').toUpperCase()
  return (
    <span className="review-author-avatar" aria-hidden="true">
      {avatarUrl && avatarUrl !== failedUrl
        ? <img src={avatarUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedUrl(avatarUrl)} />
        : initials || <UserRound size={18} strokeWidth={1.4} />}
    </span>
  )
}

function ReviewPhoto({ photo, number, onOpen }: {
  photo: AvitoReviewPhoto
  number: number
  onOpen: (photo: AvitoReviewPhoto) => void
}) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <button type="button" className="review-photo" onClick={() => onOpen(photo)}
      aria-label={'Открыть фото покупателя ' + number}>
      <img src={photo.thumbnailUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      <Maximize2 size={14} aria-hidden="true" />
    </button>
  )
}

export function Reviews() {
  const [snapshot, setSnapshot] = useState<AvitoSnapshot | null>(null)
  const [sort, setSort] = useState('recent')
  const [expanded, setExpanded] = useState(false)
  const [openedPhoto, setOpenedPhoto] = useState<AvitoReviewPhoto | null>(null)
  const [fullImageFailed, setFullImageFailed] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    let active = true
    loadAvitoSnapshot().then(value => { if (active) setSnapshot(value) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const dialog = dialogRef.current
    if (openedPhoto && dialog && !dialog.open) dialog.showModal()
  }, [openedPhoto])

  const featured = snapshot ? featuredAvitoReviews(snapshot.reviews) : []
  featured.sort((a, b) => (sort === 'rating' ? b.rating - a.rating : 0) || b.createdAt.localeCompare(a.createdAt))
  const gallery = [...new Map(featured.flatMap(review => (review.photos ?? []).map(photo => [photo.imageUrl, photo] as const))).values()].slice(0, 5)
  const visible = expanded ? featured : featured.slice(0, initialCount)
  const openPhoto = (photo: AvitoReviewPhoto) => {
    setFullImageFailed(false)
    setOpenedPhoto(photo)
  }

  return (
    <section className="section reviews" id="reviews" aria-labelledby="reviews-title">
      <div className="container">
        <div className="reviews-head">
          <div>
            <p className="eyebrow">ДЕКОРАЙ · Авито</p>
            <h2 id="reviews-title">Отзывы покупателей</h2>
          </div>
          <a className="reviews-avito-link interactive" href={avitoProfile} target="_blank" rel="noreferrer">
            Все отзывы на Авито <ArrowUpRight size={17} aria-hidden="true" />
          </a>
        </div>

        {snapshot ? (
          <>
            <div className="reviews-summary">
              <div className="reviews-score"><strong>{ratingFormatter.format(snapshot.rating)}</strong><span>из 5</span></div>
              <div className="reviews-summary-copy">
                <span>{snapshot.reviewsCount} {reviewNoun(snapshot.reviewsCount)} на Авито</span>
                <small>Последние отзывы из профиля</small>
              </div>
              {gallery.length > 0 && <div className="reviews-gallery">
                <span><Images size={15} aria-hidden="true" /> Фото покупателей</span>
                <div className="reviews-gallery-strip">
                  {gallery.map((photo, index) => <ReviewPhoto key={photo.imageUrl} photo={photo} number={index + 1} onOpen={openPhoto} />)}
                </div>
              </div>}
            </div>

            {featured.length > 0 && <>
              <div className="reviews-toolbar">
                <h3>Подборка отзывов</h3>
                {featured.length > 1 && <select aria-label="Порядок отзывов" value={sort} onChange={event => setSort(event.target.value)}>
                  <option value="recent">Сначала новые</option>
                  <option value="rating">Сначала с высокой оценкой</option>
                </select>}
              </div>
              <div className="reviews-list" id="reviews-list">
                {visible.map(review => (
                  <article className="review-entry" key={review.createdAt + ':' + review.text}>
                    <div className="review-author">
                      <ReviewAvatar review={review} />
                      <div>
                        <h4>{review.displayName || 'Покупатель на Авито'}</h4>
                        <time dateTime={review.createdAt}>{dateFormatter.format(new Date(review.createdAt))}</time>
                      </div>
                    </div>
                    <div className="review-body">
                      <div className="review-rating" role="img" aria-label={'Оценка ' + review.rating + ' из 5'}>
                        {Array.from({ length: 5 }, (_, star) => (
                          <Star key={star} size={14} strokeWidth={1.5} aria-hidden="true"
                            fill={star < review.rating ? 'currentColor' : 'none'} className={star < review.rating ? '' : 'review-star-empty'} />
                        ))}
                      </div>
                      <blockquote>«{review.text}»</blockquote>
                      {review.photos && <div className="review-attachments">
                        {review.photos.map((photo, index) => <ReviewPhoto key={photo.imageUrl} photo={photo} number={index + 1} onOpen={openPhoto} />)}
                      </div>}
                    </div>
                  </article>
                ))}
              </div>
              {featured.length > initialCount && <button type="button" className="reviews-more"
                aria-controls="reviews-list" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
                {expanded ? 'Свернуть подборку' : 'Показать ещё отзывы'}
              </button>}
            </>}
          </>
        ) : <p className="reviews-fallback">Отзывы покупателей доступны в профиле ДЕКОРАЙ на Авито.</p>}
      </div>

      <dialog className="review-lightbox" aria-label="Фото покупателя" ref={dialogRef} onClose={() => setOpenedPhoto(null)}
        onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close() }}>
        <div className="review-lightbox-content">
          <button type="button" className="icon-btn" aria-label="Закрыть фото" onClick={() => dialogRef.current?.close()}><X size={20} /></button>
          {openedPhoto && (fullImageFailed
            ? <p>Фото временно недоступно.</p>
            : <img src={openedPhoto.imageUrl} alt="Вложение к отзыву покупателя" referrerPolicy="no-referrer" onError={() => setFullImageFailed(true)} />)}
        </div>
      </dialog>
    </section>
  )
}
