import assert from 'node:assert/strict'
import { isPublicAvitoSnapshot } from '../src/lib/avitoReviews.ts'

export function assertPublicAvitoSnapshot(value, { allowFallback = false } = {}) {
  assert(isPublicAvitoSnapshot(value, allowFallback), 'Avito snapshot must contain only the approved public fields')
}
