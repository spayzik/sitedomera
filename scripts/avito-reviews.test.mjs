import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, rmdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { createAvitoSnapshot } from './avito-reviews-core.mjs'
import { featuredAvitoReviews, parseAvitoSnapshot } from '../src/lib/avitoReviews.ts'

const fixture = JSON.parse(await readFile(new URL('./fixtures/avito-responses.json', import.meta.url), 'utf8'))

test('the storefront selection omits one-star cards without changing the Avito profile aggregate', () => {
  const createdAt = '2026-11-18T12:00:00.000Z'
  const snapshot = parseAvitoSnapshot({
    source: 'avito', updatedAt: createdAt, rating: 4.8, reviewsCount: 98,
    reviews: [1, 2, 5].map(rating => ({ rating, createdAt, text: `Отзыв ${rating}` })),
  })
  assert.ok(snapshot)
  assert.deepEqual(featuredAvitoReviews(snapshot.reviews).map(review => review.rating), [2, 5])
  assert.deepEqual(snapshot.reviews.map(review => review.rating), [1, 2, 5])
  assert.equal(snapshot.rating, 4.8)
  assert.equal(snapshot.reviewsCount, 98)
  assert.deepEqual(featuredAvitoReviews(snapshot.reviews.slice(0, 1)), [])
})
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

test('strips social contacts and links from the only public free-text field', () => {
  const list = {
    total: 1,
    reviews: [{
      score: 5,
      createdAt: 1780000000,
      text: 'Панели подошли. @test_contact https://example.test/person t.me/test_contact',
    }],
  }
  const snapshot = createAvitoSnapshot(fixture.info, list, now)
  assert.equal(snapshot.reviews[0].text, 'Панели подошли. [контакт скрыт] [ссылка скрыта] [ссылка скрыта]')
})

test('requires confirmed account identity and publication permission before starting publish', () => {
  const script = fileURLToPath(new URL('./sync-avito-reviews.mjs', import.meta.url))
  const env = {
    ...process.env,
    AVITO_CLIENT_ID: 'synthetic-client',
    AVITO_CLIENT_SECRET: 'synthetic-secret',
    AVITO_ACCOUNT_ID: '',
    AVITO_REVIEW_PUBLICATION_APPROVED: '',
  }
  const noIdentity = spawnSync(process.execPath, [script, '--publish'], { env, encoding: 'utf8', timeout: 3000 })
  assert.equal(noIdentity.status, 1)
  assert.match(noIdentity.stderr, /AVITO_ACCOUNT_ID/)
  env.AVITO_ACCOUNT_ID = '123'
  const noApproval = spawnSync(process.execPath, [script, '--publish'], { env, encoding: 'utf8', timeout: 3000 })
  assert.equal(noApproval.status, 1)
  assert.match(noApproval.stderr, /Publication approval is required/)
  assert.doesNotMatch(noApproval.stderr + noIdentity.stderr, /synthetic-client|synthetic-secret/)
})

test('preflight and API failures preserve an existing snapshot', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'dekoray-avito-'))
  const snapshotFile = join(cwd, 'public', 'generated', 'avito-reviews.json')
  const script = fileURLToPath(new URL('./sync-avito-reviews.mjs', import.meta.url))
  const mock = `data:text/javascript,${encodeURIComponent(`
    globalThis.fetch = async (input, options) => {
      const url = new URL(input)
      if (url.origin !== 'https://api.avito.ru' || options.redirect !== 'error') throw new Error('unexpected request')
      const { info, list } = ${JSON.stringify(fixture)}
      const fixtureByRoute = {
        '/token': { access_token: 'synthetic-access-token' },
        '/core/v1/accounts/self': { id: 123 },
        '/ratings/v1/info': info,
        '/ratings/v1/reviews': list,
      }
      const data = fixtureByRoute[url.pathname]
      const status = url.pathname === '/ratings/v1/reviews' ? Number(process.env.TEST_AVITO_STATUS) : 200
      return Response.json(data, { status })
    }
  `)}`
  const existing = JSON.stringify(createAvitoSnapshot(fixture.info, fixture.list, now))
  try {
    await mkdir(join(cwd, 'public', 'generated'), { recursive: true })
    await writeFile(snapshotFile, existing)
    const env = {
      ...process.env,
      AVITO_CLIENT_ID: 'synthetic-client',
      AVITO_CLIENT_SECRET: 'synthetic-secret',
      AVITO_ACCOUNT_ID: '123',
      AVITO_REVIEW_PUBLICATION_APPROVED: '1',
      TEST_AVITO_STATUS: '200',
    }
    const preflight = spawnSync(process.execPath, ['--import', mock, script], { cwd, env, encoding: 'utf8', timeout: 3000 })
    assert.equal(preflight.status, 0)
    assert.match(preflight.stdout, /Ratings API returned 1 usable reviews/)
    assert.equal(await readFile(snapshotFile, 'utf8'), existing)

    for (const status of ['401', '403', '429']) {
      const result = spawnSync(process.execPath, ['--import', mock, script, '--publish'], {
        cwd, env: { ...env, TEST_AVITO_STATUS: status }, encoding: 'utf8', timeout: 3000,
      })
      assert.equal(result.status, 1)
      assert.match(result.stderr, new RegExp(`HTTP ${status}`))
      assert.doesNotMatch(result.stdout + result.stderr, /synthetic-(client|secret|access-token)/)
      assert.equal(await readFile(snapshotFile, 'utf8'), existing)
    }

    const wrongAccount = spawnSync(process.execPath, ['--import', mock, script, '--publish'], {
      cwd, env: { ...env, AVITO_ACCOUNT_ID: '124' }, encoding: 'utf8', timeout: 3000,
    })
    assert.equal(wrongAccount.status, 1)
    assert.match(wrongAccount.stderr, /does not match/)
    assert.equal(await readFile(snapshotFile, 'utf8'), existing)

    const published = spawnSync(process.execPath, ['--import', mock, script, '--publish'], { cwd, env, encoding: 'utf8', timeout: 3000 })
    assert.equal(published.status, 0)
    const snapshot = JSON.parse(await readFile(snapshotFile, 'utf8'))
    assert.notEqual(snapshot.updatedAt, now.toISOString())
    assert.deepEqual(snapshot.reviews, JSON.parse(existing).reviews)
  } finally {
    await rm(snapshotFile, { force: true })
    await rmdir(join(cwd, 'public', 'generated'))
    await rmdir(join(cwd, 'public'))
    await rmdir(cwd)
  }
})
test('approved review details carry only public display names and safe attachment variants', () => {
  const small = 'https://10.img.avito.st/reviews/small.webp'
  const large = 'https://10.img.avito.st/reviews/large.webp'
  const review = {
    ...fixture.list.reviews[0],
    sender: { name: 'Ирина Иванова', id: 912345, phone: '+7 999 123-45-67' },
    images: [
      { number: 2, sizes: [{ size: '900x600', url: large }, { size: '200x130', url: small }] },
      { number: 1, sizes: [{ size: '500x500', url: 'https://img.avito.st.example.com/a.webp' }] },
      { number: 3, sizes: [{ size: '500x500', url: 'https://img.avito.st/a.webp?token=private' }] },
    ],
  }
  const snapshot = createAvitoSnapshot(fixture.info, { ...fixture.list, reviews: [review] }, now, { includePublicDetails: true })
  assert.equal(snapshot.reviews[0].displayName, 'Ирина И.')
  assert.deepEqual(snapshot.reviews[0].photos, [{ thumbnailUrl: small, imageUrl: large }])
  assert.deepEqual(parseAvitoSnapshot(snapshot), snapshot)
  assert.doesNotMatch(JSON.stringify(snapshot), /Иванова|912345|example\.com|token=private|avatarUrl/)
})

test('malformed optional media and unsafe names never hide a valid review', () => {
  const snapshot = createAvitoSnapshot(fixture.info, fixture.list, now)
  Object.assign(snapshot.reviews[0], {
    displayName: 'user@example.com',
    avatarUrl: 'https://img.avito.st@evil.example/avatar.png',
    photos: [
      { thumbnailUrl: 'javascript:alert(1)', imageUrl: 'https://img.avito.st/review.png' },
      { thumbnailUrl: 'https://img.avito.st/a.png', imageUrl: 'https://img.avito.st/b.png' },
    ],
  })
  const parsed = parseAvitoSnapshot(snapshot)
  assert.equal(parsed.reviews.length, 1)
  assert.deepEqual(parsed.reviews[0].photos, [{ thumbnailUrl: 'https://img.avito.st/a.png', imageUrl: 'https://img.avito.st/b.png' }])
  assert.equal(parsed.reviews[0].displayName, undefined)
  assert.equal(parsed.reviews[0].avatarUrl, undefined)
  snapshot.reviews[0].avatarUrl = 'https://img.avito.st/avatar.png'
  assert.equal(parseAvitoSnapshot(snapshot).reviews[0].avatarUrl, 'https://img.avito.st/avatar.png')
})
