import assert from 'node:assert/strict'
import { parseAvitoSnapshot } from '../src/lib/avitoReviews.ts'

export function assertPublicAvitoSnapshot(value, { allowFallback = false } = {}) {
  const sameKeys = (entry, keys) => entry && typeof entry === 'object' && Object.keys(entry).sort().join(',') === keys
  const fallback = allowFallback && value?.source === 'avito' && Array.isArray(value.reviews) && value.reviews.length === 0 &&
    value.rating === null && value.reviewsCount === null && value.updatedAt === null
  assert(sameKeys(value, 'rating,reviews,reviewsCount,source,updatedAt') &&
    (fallback || (parseAvitoSnapshot(value) && value.reviews.every(review => sameKeys(review, 'createdAt,rating,text')))),
  'Avito snapshot must contain only the approved public fields')
}
