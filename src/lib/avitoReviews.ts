export type AvitoReview = {
  rating: number
  text: string
  createdAt: string
}

export type AvitoSnapshot = {
  source: 'avito'
  updatedAt: string
  rating: number
  reviewsCount: number
  reviews: AvitoReview[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function parseAvitoSnapshot(value: unknown): AvitoSnapshot | null {
  if (!isRecord(value) || value.source !== 'avito' ||
      typeof value.updatedAt !== 'string' || !Number.isFinite(Date.parse(value.updatedAt)) ||
      typeof value.rating !== 'number' || value.rating < 1 || value.rating > 5 ||
      !Number.isSafeInteger(value.reviewsCount) || (value.reviewsCount as number) < 1 ||
      !Array.isArray(value.reviews) || value.reviews.length < 1 || value.reviews.length > 8) return null

  const reviews: AvitoReview[] = []
  for (const review of value.reviews) {
    if (!isRecord(review) || !Number.isInteger(review.rating) ||
        (review.rating as number) < 1 || (review.rating as number) > 5 ||
        typeof review.text !== 'string' || !review.text.trim() || review.text.length > 600 ||
        typeof review.createdAt !== 'string' || !Number.isFinite(Date.parse(review.createdAt))) return null
    reviews.push({ rating: review.rating as number, text: review.text, createdAt: review.createdAt })
  }
  return {
    source: 'avito',
    updatedAt: value.updatedAt,
    rating: value.rating,
    reviewsCount: value.reviewsCount as number,
    reviews,
  }
}

export async function loadAvitoSnapshot(): Promise<AvitoSnapshot | null> {
  try {
    const url = new URL('generated/avito-reviews.json', document.baseURI)
    const response = await fetch(url)
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return null
    return parseAvitoSnapshot(await response.json())
  } catch {
    return null
  }
}
