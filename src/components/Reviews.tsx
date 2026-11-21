import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Images, Maximize2, Star, X } from 'lucide-react'
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
  if ((!avatarUrl || avatarUrl === failedUrl) && !initials) return null
  return (
    <span className="review-author-avatar" aria-hidden="true">
      {avatarUrl && avatarUrl !== failedUrl
        ? <img src={avatarUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedUrl(avatarUrl)} />
        : initials}
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

export function Reviews({ assetBase, compact = false }: { assetBase?: string; compact?: boolean } = {}) {
  const [snapshot, setSnapshot] = useState<AvitoSnapshot | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [sort, setSort] = useState('recent')
  const [expanded, setExpanded] = useState(false)
  const [openedPhoto, setOpenedPhoto] = useState<AvitoReviewPhoto | null>(null)
  const [fullImageFailed, setFullImageFailed] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    let active = true
    loadAvitoSnapshot(assetBase).then(value => { if (active) { setSnapshot(value); setLoaded(true) } })
    return () => { active = false }
  }, [assetBase])

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
    <section className={compact ? "section reviews reviews-compact" : "section reviews"} id="reviews"
      aria-labelledby={compact ? undefined : "reviews-title"} aria-label={compact ? "Отзывы на Авито" : undefined}>
      <div className="container">
        <div className="reviews-sheet">
          <div className="reviews-head">
            {!compact && <h2 id="reviews-title">Отзывы покупателей</h2>}
            {snapshot && <div className="reviews-summary">
              <div className="reviews-score">
                <Star size={17} aria-hidden="true" fill="currentColor" />
                <strong>{ratingFormatter.format(snapshot.rating)}</strong><span>из 5</span>
              </div>
              <p>{snapshot.reviewsCount} {reviewNoun(snapshot.reviewsCount)} на Авито</p>
              <p>Обновлено <time dateTime={snapshot.updatedAt}>{dateFormatter.format(new Date(snapshot.updatedAt))}</time></p>
            </div>}
            <a className="reviews-avito-link interactive" href={avitoProfile} target="_blank" rel="noreferrer">
              Все отзывы на Авито <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>

          {snapshot ? (
            <div className="reviews-content">
                {gallery.length > 0 && <div className="reviews-gallery">
                  <span><Images size={15} aria-hidden="true" /> Фото покупателей</span>
                  <div className="reviews-gallery-strip">
                    {gallery.map((photo, index) => <ReviewPhoto key={photo.imageUrl} photo={photo} number={index + 1} onOpen={openPhoto} />)}
                  </div>
                </div>}

              {featured.length > 0 && <>
                <div className="reviews-toolbar">
                  {featured.length > 1 && <select aria-label="Порядок отзывов" value={sort} onChange={event => setSort(event.target.value)}>
                    <option value="recent">Сначала новые</option>
                    <option value="rating">Сначала с высокой оценкой</option>
                  </select>}
                </div>
                <div className="reviews-list" id="reviews-list">
                  {visible.map(review => (
                    <article className="review-entry" key={review.createdAt + ':' + review.text}>
                      <div className="review-author">
                        {(review.displayName || review.avatarUrl) && (
                          <div className="review-byline">
                            <ReviewAvatar review={review} />
                            {review.displayName && <h3>{review.displayName}</h3>}
                          </div>
                        )}
                        {!review.displayName && <span className="review-source-label">Отзыв на Авито</span>}
                        <time dateTime={review.createdAt}>{dateFormatter.format(new Date(review.createdAt))}</time>
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
            </div>
          ) : <p className="reviews-fallback">{loaded ? "Снимок отзывов временно недоступен. Отзывы можно прочитать в профиле ДЕКОРАЙ на Авито." : "Отзывы покупателей доступны в профиле ДЕКОРАЙ на Авито."}</p>}
        </div>
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
