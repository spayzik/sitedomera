import { parseAvitoReviewDetails, type AvitoReviewPhoto } from './avitoReviewDetails.ts'

export type AvitoReview = {
  rating: number
  text: string
  createdAt: string
  displayName?: string
  avatarUrl?: string
  photos?: AvitoReviewPhoto[]
}

export type AvitoSnapshot = {
  source: 'avito'
  updatedAt: string
  rating: number
  reviewsCount: number
  reviews: AvitoReview[]
}

export function featuredAvitoReviews(reviews: readonly AvitoReview[]): AvitoReview[] {
  return reviews.filter(review => review.rating > 1)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function parseAvitoSnapshot(value: unknown): AvitoSnapshot | null {
  if (!isRecord(value) || value.source !== 'avito' ||
      typeof value.updatedAt !== 'string' || !Number.isFinite(Date.parse(value.updatedAt)) ||
      typeof value.rating !== 'number' || !Number.isFinite(value.rating) || value.rating < 1 || value.rating > 5 ||
      !Number.isSafeInteger(value.reviewsCount) || (value.reviewsCount as number) < 1 ||
      !Array.isArray(value.reviews) || value.reviews.length < 1 || value.reviews.length > 8) return null

  const reviews: AvitoReview[] = []
  for (const review of value.reviews) {
    if (!isRecord(review) || !Number.isInteger(review.rating) ||
        (review.rating as number) < 1 || (review.rating as number) > 5 ||
        typeof review.text !== 'string' || !review.text.trim() || review.text.length > 600 ||
        typeof review.createdAt !== 'string' || !Number.isFinite(Date.parse(review.createdAt))) return null
    reviews.push({ rating: review.rating as number, text: review.text, createdAt: review.createdAt, ...parseAvitoReviewDetails(review) })
  }
  return {
    source: 'avito',
    updatedAt: value.updatedAt,
    rating: value.rating,
    reviewsCount: value.reviewsCount as number,
    reviews,
  }
}

function hasOnlyKeys(record: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(record).length === keys.length && keys.every(key => Object.hasOwn(record, key))
}

export function isPublicAvitoSnapshot(value: unknown, allowEmpty = false): boolean {
  if (!isRecord(value) || !hasOnlyKeys(value, ['source', 'updatedAt', 'rating', 'reviewsCount', 'reviews']) ||
      value.source !== 'avito' || !Array.isArray(value.reviews)) return false

  if (value.reviews.length === 0) {
    return allowEmpty && value.updatedAt === null && value.rating === null && value.reviewsCount === null
  }

  const snapshot = parseAvitoSnapshot(value)
  if (!snapshot) return false
  return value.reviews.every((review, index) => {
    const parsed = snapshot.reviews[index]
    if (!isRecord(review) || !hasOnlyKeys(review, Object.keys(parsed)) ||
        review.displayName !== parsed.displayName || review.avatarUrl !== parsed.avatarUrl) return false
    if (!parsed.photos) return true
    return Array.isArray(review.photos) && review.photos.length === parsed.photos.length &&
      review.photos.every((photo, photoIndex) => isRecord(photo) && hasOnlyKeys(photo, ['thumbnailUrl', 'imageUrl']) &&
        photo.thumbnailUrl === parsed.photos?.[photoIndex].thumbnailUrl &&
        photo.imageUrl === parsed.photos?.[photoIndex].imageUrl)
  })
}

export async function loadAvitoSnapshot(assetBase = './'): Promise<AvitoSnapshot | null> {
  try {
    const url = new URL('generated/avito-reviews.json', new URL(assetBase, document.baseURI))
    const response = await fetch(url)
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return null
    return parseAvitoSnapshot(await response.json())
  } catch {
    return null
  }
}
