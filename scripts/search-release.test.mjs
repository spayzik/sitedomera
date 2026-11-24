import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { CONTACTS } from '../src/data/products.ts'
import { changedIndexNowPaths, indexNowKey, indexNowPayload, readIndexNowRelease } from './indexnow.mjs'
import { searchOwnership } from './search-ownership.mjs'

test('IndexNow computes new, changed and removed production routes once', () => {
  const a = 'a'.repeat(64)
  const b = 'b'.repeat(64)
  const release = { host: CONTACTS.hostname, routes: { '/': a, '/catalog/': b, '/news/': a } }
  const previous = { '/': a, '/catalog/': a, '/old-route/': a }
  const current = readIndexNowRelease(JSON.stringify(release))
  const paths = changedIndexNowPaths(previous, current)
  assert.deepEqual(paths, ['/catalog/', '/old-route/', '/news/'])
  const key = indexNowKey({ VITE_DEKORAY_PREVIEW: '0' })
  assert.match(key, /^[0-9a-f]{48}$/)
  assert.equal(indexNowKey({ VITE_DEKORAY_PREVIEW: '1', DEKORAY_INDEXNOW_KEY: key }), undefined)
  assert.equal(indexNowPayload(key, paths, ['/old-route/']).urlList.length, 3)
  assert.throws(() => indexNowPayload(key, paths))
  assert.throws(() => readIndexNowRelease(JSON.stringify({ ...release, host: 'spayzik.github.io' })))
  assert.throws(() => indexNowPayload(key, ['/catalog/?x=1']))
})

test('verification assets preserve provider contents and are absent in staging', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'dekoray-verify-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const google = join(dir, 'google0123456789.html')
  const yandex = join(dir, 'yandex_9876543210.html')
  const googleProof = 'google-site-verification: google0123456789.html\r\n'
  const yandexProof = '<html><head></head><body>Verification: 9876543210</body></html>\n'
  await writeFile(google, googleProof)
  await writeFile(yandex, yandexProof)
  const env = {
    DEKORAY_GOOGLE_VERIFICATION_FILE: google,
    DEKORAY_YANDEX_VERIFICATION_FILE: yandex,
    DEKORAY_GOOGLE_VERIFICATION_META: 'test-meta_012345',
    DEKORAY_YANDEX_VERIFICATION_META: '9876543210',
  }
  const release = await searchOwnership(env)
  assert.deepEqual([...release.files.values()].map(bytes => bytes.toString()), [googleProof, yandexProof])
  assert.deepEqual(release.tags.map(tag => tag.match(/name="([^"]+)"/)[1]), ['google-site-verification', 'yandex-verification'])
  assert.deepEqual(await searchOwnership({ ...env, VITE_DEKORAY_PREVIEW: '1' }), { files: new Map(), tags: [] })
  await writeFile(yandex, yandexProof + '<script>alert(1)</script>')
  await assert.rejects(searchOwnership(env), /Unexpected YANDEX/)
})
