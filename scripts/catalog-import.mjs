import { createHash } from 'node:crypto'
import { readFile, realpath, writeFile, rename } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { products, sourceInventory } from '../src/data/products.ts'
import { supplementalCatalog, supplementalImageSizes } from '../src/data/catalogSupplement.ts'
import { feedOfferId } from '../src/data/feedOfferIds.ts'
import { productPath } from '../src/data/seoPaths.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
const categories = {
  wood: 'panel', fabric: 'panel', metal: 'panel', bamboo_stone: 'panel',
  soft: 'panel', plaster: 'panel', flexible_stone: 'flexible_stone', slats: 'slat', profiles: 'profile',
}
const views = ['detail', 'full', 'angle', 'installed', 'comparison']
const requiredViews = views.slice(0, 4)
const text = (value, min, max) => typeof value === 'string' && value === value.trim() &&
  value.length >= min && value.length <= max && !/[\u0000-\u001f<>]/u.test(value)
const positive = (value, max) => Number.isFinite(value) && value > 0 && value <= max

export async function reviewSupplement(input, publicRoot, existing = products) {
  if (input?.version !== 1 || !Array.isArray(input.items) || !input.items.length || input.items.length > 1000) {
    throw new Error('Expected a version 1 document with 1–1000 approved items.')
  }
  const approvedRoot = await realpath(publicRoot)
  const seenSkus = new Set(existing.flatMap(item => item.sku ? [item.sku.toUpperCase()] : []))
  const seenPaths = new Set(existing.map(productPath))
  const seenIds = new Set(existing.map(item => item.id))
  const knownFeedIds = new Set(existing.map(item => feedOfferId(item.id)).filter(Boolean))
  const usedImages = new Set(existing.flatMap(item => [item.image, ...(item.gallery ?? []).map(photo => photo.image)]))
  const rows = []
  const dimensions = {}
  for (const [index, item] of input.items.entries()) {
    const fail = reason => { throw new Error('Row ' + (index + 1) + ': ' + reason) }
    if (item?.approved !== true || !text(item.reference, 5, 200) || !text(item.imageReview, 5, 200)) {
      fail('reviewed commercial source and photo provenance required')
    }
    const { sku, categoryId, name, priceRub, unit, description } = item
    const kind = Object.hasOwn(categories, categoryId) ? categories[categoryId] : undefined
    if (typeof sku !== 'string' || !/^[A-Z0-9][A-Z0-9-]{1,63}$/.test(sku) || seenSkus.has(sku)) fail('missing or duplicate official SKU')
    if (!kind || !text(name, 2, 100) || !text(description, 400, 800)) fail('invalid category, display name or reviewed description')
    if (!positive(priceRub, 100_000_000) || !Number.isSafeInteger(priceRub * 100) || !['лист', 'шт'].includes(unit)) fail('invalid approved price or unit')
    if ((kind === 'profile' || kind === 'slat') && unit !== 'шт') fail('linear products use piece pricing')

    const lengthMm = item.dimensions?.lengthMm
    const widthMm = item.dimensions?.widthMm
    if (!positive(lengthMm, 20_000) || !Number.isInteger(lengthMm) ||
        (kind !== 'profile' || widthMm !== undefined) && (!positive(widthMm, 20_000) || !Number.isInteger(widthMm))) {
      fail('invalid dimensions in millimetres')
    }
    const { thicknessMm, weightKg, material } = item
    if (thicknessMm !== undefined && !positive(thicknessMm, 1000) ||
        weightKg !== undefined && !positive(weightKg, 500) ||
        material !== undefined && !text(material, 2, 100)) fail('invalid additional specification')

    const photos = item.photos
    if (!Array.isArray(photos) || photos.length < 4 || photos.length > 8 ||
        !requiredViews.every(view => photos.some(photo => photo?.view === view))) fail('four to eight real photos with all required views')
    const gallery = []
    const hashes = new Set()
    for (const photo of photos) {
      if (!views.includes(photo?.view) || typeof photo.image !== 'string' ||
          !/^catalog\/approved\/[a-z0-9-]+\/[a-z0-9-]+\.webp$/.test(photo.image) ||
          usedImages.has(photo.image)) fail('photo paths must be distinct approved WebP assets')
      const target = resolve(approvedRoot, photo.image)
      if (await realpath(target) !== target) fail('photo must resolve inside the approved public asset path')
      const bytes = await readFile(target)
      const hash = createHash('sha256').update(bytes).digest('hex')
      if (hashes.has(hash)) fail('duplicate photo content')
      const { format, width, height } = await sharp(bytes).metadata()
      if (format !== 'webp' || !width || !height || (photo.view === 'detail' && (width < 450 || height < 450))) {
        fail('detail photograph must be native WebP at least 450 × 450')
      }
      hashes.add(hash)
      usedImages.add(photo.image)
      dimensions[photo.image] = [width, height]
      gallery.push({ image: photo.image, view: photo.view })
    }
    const primaryIndex = gallery.findIndex(photo => photo.view === 'detail')
    gallery.unshift(...gallery.splice(primaryIndex, 1))
    const offerId = createHash('sha256').update('dekoray-catalog-v1:' + sku).digest('hex').slice(0, 20)
    const id = 'catalog-' + offerId
    const path = productPath({ categoryId, name, sku })
    if (seenPaths.has(path) || seenIds.has(id) || knownFeedIds.has(offerId)) fail('product route or stable public identity collision')
    seenSkus.add(sku)
    seenPaths.add(path)
    seenIds.add(id)
    knownFeedIds.add(offerId)
    rows.push({
      id, categoryId, kind, name, sku, priceRub, unit, description, dimensions: { lengthMm, widthMm },
      thicknessMm, weightKg, material, gallery, image: gallery[0].image, imageStatus: 'original_approved',
      source: { reference: item.reference }, imageEvidence: item.imageReview, status: 'verified',
    })
  }
  return { rows, dimensions }
}

async function main(argv) {
  const [privateInput, mode] = argv
  if (!privateInput || !['--check', '--append'].includes(mode) || argv.length !== 2) {
    throw new Error('Usage: node scripts/catalog-import.mjs /path/to/owner-export.json --check|--append')
  }
  const input = JSON.parse(await readFile(privateInput, 'utf8'))
  const existing = [...products, ...sourceInventory.filter(item => item.sku && !products.some(product => product.id === item.id))]
  const { rows, dimensions } = await reviewSupplement(input, resolve(root, 'public'), existing)
  if (mode === '--append') {
    const output = resolve(root, 'src/data/catalogSupplement.ts')
    const content = "import type { SourceProduct } from './catalogModel.ts'\n\n" +
      '// Generated by scripts/catalog-import.mjs. Do not add records without confirmation.\n' +
      'export const supplementalCatalog: readonly SourceProduct[] = ' + JSON.stringify([...supplementalCatalog, ...rows], null, 2) + '\n' +
      'export const supplementalImageSizes: Readonly<Record<string, readonly [number, number]>> = ' +
      JSON.stringify({ ...supplementalImageSizes, ...dimensions }, null, 2) + '\n'
    const temp = resolve(dirname(output), '.catalogSupplement-' + process.pid + '.tmp')
    await writeFile(temp, content, { flag: 'wx' })
    await rename(temp, output)
  }
  console.log(JSON.stringify({ reviewed: rows.length, images: Object.keys(dimensions).length, written: mode === '--append' }))
}

if (import.meta.main) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
