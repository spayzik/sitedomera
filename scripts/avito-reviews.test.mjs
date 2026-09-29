import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { createAvitoSnapshot } from './avito-reviews-core.mjs'

const fixture = JSON.parse(await readFile(new URL('./fixtures/avito-responses.json', import.meta.url), 'utf8'))
const now = new Date('2026-09-29T12:00:00.000Z')

test('publishes only the minimal fields from a valid API response', () => {
  const snapshot = createAvitoSnapshot(fixture.info, fixture.list, now)
  assert.deepEqual(Object.keys(snapshot), ['source', 'updatedAt', 'rating', 'reviewsCount', 'reviews'])
  assert.equal(snapshot.rating, 4.8)
  assert.equal(snapshot.reviewsCount, 23)
  assert.equal(snapshot.reviews.length, 1)
  assert.deepEqual(Object.keys(snapshot.reviews[0]), ['rating', 'text', 'createdAt'])
  assert.equal(snapshot.reviews[0].createdAt, new Date(1780000000 * 1000).toISOString())
  assert.doesNotMatch(JSON.stringify(snapshot), /test@example\.com|999 123|Тестовый автор|98765|123456/)
  assert.match(snapshot.reviews[0].text, /\[контакт скрыт\]/)
})

test('rejects malformed API responses instead of producing a false snapshot', () => {
  assert.throws(() => createAvitoSnapshot({ ...fixture.info, rating: { score: 9, reviewsCount: 23 } }, fixture.list, now))
  assert.throws(() => createAvitoSnapshot(fixture.info, { total: 23, reviews: [{ score: 99, text: 'Неверно', createdAt: 1780000000 }] }, now))
  assert.throws(() => createAvitoSnapshot(fixture.info, { total: 0, reviews: [] }, now))
})

test('bounds review text, filters invalid entries and never includes raw metadata', () => {
  const list = {
    total: 2,
    reviews: [
      { score: 5, text: 'x'.repeat(700), createdAt: 1780000000, privateData: 'do not publish' },
      { score: 5, text: 'future', createdAt: 1999999999 },
    ],
  }
  const snapshot = createAvitoSnapshot(fixture.info, list, now)
  assert.equal(snapshot.reviews.length, 1)
  assert.equal(snapshot.reviews[0].text.length, 600)
  assert.doesNotMatch(JSON.stringify(snapshot), /privateData|do not publish/)
})
