import { avitoDisplayName, avitoImageUrl, MAX_REVIEW_PHOTOS } from '../src/lib/avitoReviewDetails.ts'

export const MAX_REVIEWS = 8
export const REQUEST_LIMIT = 12

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

function publicText(value) {
  if (typeof value !== 'string') return ''
  const withoutControls = Array.from(value.slice(0, 2400), (character) => {
    const code = character.codePointAt(0)
    return code < 32 || code === 127 ? ' ' : character
  }).join('')
  return withoutControls
    .replace(/(?:https?:\/\/|www\.|(?:t\.me|wa\.me|vk\.com)\/)[^\s<>"«»]+/gi, '[ссылка скрыта]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[контакт скрыт]')
    .replace(/(^|\s)@[a-z0-9_]{3,}\b/gi, '$1[контакт скрыт]')
    .replace(/\+?\d[\d\s().-]{8,}\d/g, (match) =>
      match.replace(/\D/g, '').length >= 10 ? '[контакт скрыт]' : match)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 600)
}

function publicDetails(raw) {
  const displayName = avitoDisplayName(raw.sender?.name)
  const photos = []
  const images = Array.isArray(raw.images) ? raw.images.filter(image =>
    isRecord(image) && Number.isSafeInteger(image.number) && Array.isArray(image.sizes),
  ).sort((a, b) => a.number - b.number) : []
  for (const image of images) {
    const variants = image.sizes.flatMap(variant => {
      if (!isRecord(variant) || typeof variant.size !== 'string') return []
      const url = avitoImageUrl(variant.url)
      const dimensions = /^([1-9]\d{0,4})x([1-9]\d{0,4})$/.exec(variant.size)
      if (!url || !dimensions) return []
      const width = Number(dimensions[1])
      return [{ url, width, area: width * Number(dimensions[2]) }]
    }).sort((a, b) => a.area - b.area)
    if (variants.length === 0) continue
    const imageUrl = variants.at(-1).url
    if (photos.some(photo => photo.imageUrl === imageUrl)) continue
    const thumbnailUrl = (variants.find(variant => variant.width >= 160) ?? variants.at(-1)).url
    photos.push({ thumbnailUrl, imageUrl })
    if (photos.length === MAX_REVIEW_PHOTOS) break
  }
  return { ...(displayName && { displayName }), ...(photos.length > 0 && { photos }) }
}

export function createAvitoSnapshot(info, list, now = new Date(), { includePublicDetails = false } = {}) {
  if (!isRecord(info) || info.isEnabled !== true || !isRecord(info.rating)) {
    throw new Error('Ratings API returned no enabled rating')
  }
  const { score, reviewsCount } = info.rating
  if (!Number.isFinite(score) || score < 1 || score > 5 ||
      !Number.isSafeInteger(reviewsCount) || reviewsCount < 1) {
    throw new Error('Ratings API returned invalid rating summary')
  }
  if (!isRecord(list) || !Array.isArray(list.reviews) ||
      !Number.isSafeInteger(list.total) || list.total < 1) {
    throw new Error('Ratings API returned invalid review list')
  }
  const nowMs = now.getTime()
  if (!Number.isFinite(nowMs)) throw new Error('Invalid sync time')

  const seen = new Set()
  const reviews = []
  for (const raw of list.reviews.slice(0, REQUEST_LIMIT)) {
    if (!isRecord(raw) || !Number.isInteger(raw.score) || raw.score < 1 || raw.score > 5 ||
        !Number.isSafeInteger(raw.createdAt)) continue
    const dateMs = raw.createdAt * 1000 // Ratings API uses Unix seconds.
    if (dateMs < Date.UTC(2000, 0, 1) || dateMs > nowMs + 86_400_000) continue
    const text = publicText(raw.text)
    if (!text) continue
    const createdAt = new Date(dateMs).toISOString()
    const key = `${createdAt}:${text}`
    if (seen.has(key)) continue
    seen.add(key)
    reviews.push({ rating: raw.score, text, createdAt, ...(includePublicDetails && publicDetails(raw)) })
  }
  reviews.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  if (reviews.length === 0) throw new Error('Ratings API returned no usable reviews')

  return {
    source: 'avito',
    updatedAt: now.toISOString(),
    rating: Math.round(score * 10) / 10,
    reviewsCount,
    reviews: reviews.slice(0, MAX_REVIEWS),
  }
}
