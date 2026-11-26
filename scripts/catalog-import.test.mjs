import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { reviewSupplement } from './catalog-import.mjs'
import { feedOfferId } from '../src/data/feedOfferIds.ts'

test('approved import consumes native asset views and rejects missing or duplicate approvals', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'dekoray-import-'))
  const directory = 'catalog/approved/synthetic'
  try {
    await mkdir(resolve(root, directory), { recursive: true })
    const views = ['detail', 'full', 'angle', 'installed']
    const photos = await Promise.all(views.map(async (view, i) => {
      const image = directory + '/' + view + '.webp'
      await sharp({ create: { width: 550, height: 450, channels: 3, background: { r: 251, g: 100 + i * 12, b: 2 } } })
        .webp().toFile(resolve(root, image))
      return { image, view }
    }))
    const entry = {
      approved: true, reference: 'Synthetic invoice review', imageReview: 'Synthetic asset scope',
      sku: 'SYNTHETIC-ITEM', name: 'Проверочный образец', categoryId: 'wood', priceRub: 7600, unit: 'шт',
      dimensions: { widthMm: 1210, lengthMm: 2900 },
      description: 'Учебный текст проверки состава карточки. '.repeat(12).trim(),
      photos: [photos[1], photos[0], photos[2], photos[3]],
    }
    const input = { version: 1, items: [entry] }
    const { rows, dimensions } = await reviewSupplement(input, root, [])
    assert.equal(rows.length, 1)
    assert.equal(rows[0].gallery.length, 4)
    assert.equal(rows[0].image, photos[0].image)
    assert.deepEqual(dimensions[photos[0].image], [550, 450])
    assert.equal(rows[0].id, 'catalog-' + feedOfferId(rows[0].id))
    assert.equal((await reviewSupplement(input, root, [])).rows[0].id, rows[0].id)
    await assert.rejects(reviewSupplement(input, root, rows), /duplicate official SKU/)
    await assert.rejects(reviewSupplement({ version: 1, items: [{ ...entry, approved: false }] }, root, []), /provenance required/)
    await assert.rejects(reviewSupplement({ version: 1, items: [{ ...entry, photos: photos.slice(0, 3) }] }, root, []), /required views/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
