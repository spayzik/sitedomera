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
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[контакт скрыт]')
    .replace(/\+?\d[\d\s().-]{8,}\d/g, (match) =>
      match.replace(/\D/g, '').length >= 10 ? '[контакт скрыт]' : match)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 600)
}

export function createAvitoSnapshot(info, list, now = new Date()) {
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
    reviews.push({ rating: raw.score, text, createdAt })
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
