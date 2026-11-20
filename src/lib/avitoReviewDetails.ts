export type AvitoReviewPhoto = { thumbnailUrl: string; imageUrl: string }

export const MAX_REVIEW_PHOTOS = 4

export const isReviewRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

export function avitoDisplayName(value: unknown) {
  if (typeof value !== 'string' || value.length > 80) return
  const name = value.normalize('NFC').trim()
  if (!/^\p{L}[\p{L}'’-]*(?: +\p{L}[\p{L}'’-]*\.?){0,3}$/u.test(name)) return
  const [first, last] = name.split(/ +/)
  return last ? first + ' ' + Array.from(last)[0].toUpperCase() + '.' : first
}

export function avitoImageUrl(value: unknown) {
  if (typeof value !== 'string' || value.length > 2048) return
  try {
    const url = new URL(value)
    const cdn = url.hostname === 'img.avito.st' || url.hostname.endsWith('.img.avito.st')
    if (cdn && url.protocol === 'https:' && !url.username && !url.password && !url.port &&
        !url.search && !url.hash && url.pathname !== '/') return url.href
  } catch { /* A missing or invalid optional image keeps the text review visible. */ }
}

export function parseAvitoReviewDetails(value: Record<string, unknown>) {
  const displayName = avitoDisplayName(value.displayName)
  const avatarUrl = avitoImageUrl(value.avatarUrl)
  const photos = Array.isArray(value.photos) ? value.photos.slice(0, MAX_REVIEW_PHOTOS).flatMap(photo => {
    if (!isReviewRecord(photo)) return []
    const thumbnailUrl = avitoImageUrl(photo.thumbnailUrl)
    const imageUrl = avitoImageUrl(photo.imageUrl)
    return thumbnailUrl && imageUrl ? [{ thumbnailUrl, imageUrl }] : []
  }) : []
  return {
    ...(displayName && { displayName }),
    ...(avatarUrl && { avatarUrl }),
    ...(photos.length > 0 && { photos }),
  }
}
