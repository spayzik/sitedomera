import assert from 'node:assert/strict'
import { test } from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import * as catalog from '../src/data/products.ts'
import { calculatePanels } from '../src/lib/calculator.ts'
import { formatCartTelegramMessage, formatProductTelegramMessage } from '../src/lib/telegramLink.ts'

test('category navigation preserves product and other query parameters through product open/close', async () => {
  const { parseCatalogHash, updateCatalogHash } = await import('../src/lib/catalogNavigation.ts')
  for (const c of catalog.collections) {
    const hash = updateCatalogHash('#/catalog', { category: c.id })
    assert.equal(parseCatalogHash(hash).categoryId, c.id)
    assert.ok(catalog.filterProducts(parseCatalogHash(hash).categoryId, '').length)
  }
  const base = '#/catalog?category=fabric&campaign=a%26b'
  const opened = updateCatalogHash(base, { sku: '671-A227' })
  assert.equal(parseCatalogHash(opened).product.sku, '671-A227')
  assert.equal(parseCatalogHash(opened).categoryId, 'fabric')
  assert.equal(new URLSearchParams(opened.split('?')[1]).get('campaign'), 'a&b')
  const closed = updateCatalogHash(opened, { sku: null })
  assert.equal(closed, base)
  assert.equal(parseCatalogHash(closed).product, null)
  assert.equal(parseCatalogHash('#/catalog?category=invalid&sku=unknown').categoryId, 'all')
  assert.equal(parseCatalogHash(updateCatalogHash(opened, { category: 'wood' })).product.sku, '671-A227')
})

test('quiz uses all three answers, restarts cleanly and never filters panels by project budget', async () => {
  const { quizQuestions, createQuizState, quizReducer, quizResultContext } = await import('../src/lib/quiz.ts')
  assert.equal(quizQuestions.length, 3)
  let state = createQuizState()
  for (const [step, id] of ['bedroom', 'cozy', 'basic'].entries()) {
    assert.equal(state.step, step)
    state = quizReducer(state, { type: 'answer', id })
  }
  assert.equal(state.step, 3)
  assert.deepEqual(state.answers, { room: 'bedroom', style: 'cozy', budget: 'basic' })
  assert.match(quizResultContext(state), /Спальня/)
  assert.match(quizResultContext(state), /60 000/)
  assert.deepEqual(state.categoryIds, ['wood', 'fabric', 'soft'])
  state = quizReducer(state, { type: 'product', id: 'pdf2026-p06-r1c2' })
  assert.equal(state.productId, 'pdf2026-p06-r1c2')
  state = quizReducer(state, { type: 'category', id: 'fabric' })
  assert.equal(state.productId, '')
  state = quizReducer(state, { type: 'restart' })
  assert.deepEqual(state, createQuizState())
  for (const id of ['office', 'metal', 'premium']) state = quizReducer(state, { type: 'answer', id })
  assert.deepEqual(state.categoryIds, ['metal'])
  assert.match(quizResultContext(state), /Офис/)
  assert.match(quizResultContext(state), /120 000/)
  const invalid = quizReducer(state, { type: 'product', id: 'pdf2026-p06-r1c2' })
  assert.equal(invalid.productId, '')
  let lowBudget = createQuizState()
  for (const id of ['office', 'metal', 'basic']) lowBudget = quizReducer(lowBudget, { type: 'answer', id })
  assert.deepEqual(lowBudget.categoryIds, state.categoryIds)
})

test('cart reports only actually excluded known retired IDs and acknowledgement survives migration', async () => {
  const { migrateCart, restoreCart, cartSnapshot, loadCartState, retiredCartIds } = await import('../src/lib/cart.ts')
  assert.equal(retiredCartIds.length, 19)
  const raw = [{ id: '919-4', qty: 2 }, { id: 'C807601-36', qty: 1 }, { id: 'unknown', qty: 1 }]
  const result = migrateCart(raw)
  assert.deepEqual(result.retiredIds, ['919-4'])
  assert.equal(result.items.length, 1)
  assert.equal(result.items[0].product.priceRub, 7000)
  assert.deepEqual(restoreCart(raw), result.items)
  assert.equal(loadCartState(raw, false).migrationNotice, true)
  const migrated = cartSnapshot(result.items)
  assert.equal(loadCartState(migrated, true).migrationNotice, true)
  assert.equal(loadCartState(migrated, false).migrationNotice, false)
  assert.equal(loadCartState([], false).migrationNotice, false)
  assert.equal(loadCartState([{ id: 'unknown', qty: 1 }], false).migrationNotice, false)
  assert.deepEqual(migrateCart([{ id: '919-4', qty: 1 }]).items, [])
  assert.equal(loadCartState([{ id: '919-4', qty: 1 }], false).migrationNotice, true)
  assert.deepEqual(migrateCart([{ id: '919-4', qty: -1 }]).retiredIds, [])
})

const counts = { wood: 11, fabric: 11, metal: 3, bamboo_stone: 2, soft: 2, flexible_stone: 4, plaster: 2, slats: 3, profiles: 8 }

test('independently reviewed source inventory retains all 46 cards and nine categories', () => {
  assert.ok(Array.isArray(catalog.sourceInventory), 'source inventory must be exported')
  assert.equal(catalog.sourceInventory.length, 46)
  assert.equal(new Set(catalog.sourceInventory.map(p => p.id)).size, 46)
  for (const [id, count] of Object.entries(counts)) {
    assert.equal(catalog.sourceInventory.filter(p => p.categoryId === id).length, count, id)
  }
  assert.equal(catalog.products.length, 45)
  assert.equal(catalog.collections.length, 9)
  const unresolved = catalog.sourceInventory.filter(p => p.status === 'owner_review_required')
  assert.equal(unresolved.length, 1)
  assert.equal(unresolved[0].source.pdfPage, 11)
  assert.equal(unresolved[0].source.slot, 'r2c2')
  assert.equal(unresolved[0].name, null)
  assert.equal(unresolved[0].sku, null)
  assert.ok(!catalog.products.some(p => p.id === unresolved[0].id))
})

test('prices, units and numeric specifications are explicit per source card', () => {
  const published = catalog.products
  assert.equal(published.length, 45)
  const skus = published.filter(p => p.sku !== null).map(p => p.sku)
  assert.equal(skus.length, new Set(skus).size)
  const rules = {
    wood: [7000, 'шт'], fabric: [8000, 'лист'], metal: [8000, 'лист'],
    bamboo_stone: [8000, 'лист'], soft: [8000, 'шт'], flexible_stone: [9000, 'лист'],
    plaster: [6000, 'шт'], slats: [1500, 'шт'], profiles: [600, 'шт'],
  }
  for (const p of published) {
    const expected = p.categoryId === 'fabric' && p.source.pdfPage === 9 ? [7000, 'лист'] : rules[p.categoryId]
    assert.equal(p.priceRub, expected[0], p.id)
    assert.equal(p.unit, expected[1], p.id)
    assert.ok(p.dimensions.lengthMm === 3000)
    assert.ok(p.availabilityStatus === undefined, 'PDF does not establish stock')
    if (p.kind === 'flexible_stone') {
      assert.equal(p.thicknessMm, 2.5)
      assert.equal(p.weightKg, undefined)
      assert.equal(p.material, undefined)
    } else if (p.kind === 'slat' || p.kind === 'profile') {
      assert.equal(p.thicknessMm, undefined)
      assert.equal(p.weightKg, undefined)
      assert.equal(p.dimensions.widthMm, p.kind === 'slat' ? 155 : undefined)
    }
    if (p.categoryId === 'soft') {
      assert.equal(p.thicknessMm, 7)
      assert.equal(p.weightKg, 13)
    }
  }
  assert.equal(catalog.sourceInventory.filter(p => p.sku === null && !p.skuReview).length, 14)
  assert.equal(catalog.sourceInventory.filter(p => p.skuReview).length, 1)
})

test('filters search optional SKU safely and count only published products', () => {
  assert.equal(typeof catalog.filterProducts, 'function')
  assert.equal(catalog.filterProducts('all', '').length, 45)
  assert.equal(catalog.filterProducts('fabric', '').length, 10)
  assert.equal(catalog.filterProducts('all', 'ясень серый').length, 1)
  assert.equal(catalog.filterProducts('all', 'c807601-36')[0].sku, 'C807601-36')
  assert.equal(catalog.filterProducts('profiles', '').length, 8)
  assert.equal(catalog.filterProducts('all', '919-4').length, 0)
  assert.equal(catalog.filterProducts('wood', 'not-a-product').length, 0)
})

test('every product image has source evidence and exists; retired assets remain intact', () => {
  assert.equal(catalog.products.length, 45)
  for (const p of catalog.products) {
    assert.ok(['confirmed_reused', 'pdf_preview'].includes(p.imageStatus))
    assert.ok(p.imageEvidence)
    assert.ok(existsSync(new URL(`../public/${p.image}`, import.meta.url)), p.image)
    assert.equal(p.swatch, p.image)
  }
  assert.ok(existsSync(new URL('../public/catalog/products/919-4.webp', import.meta.url)))
})

test('cart migration preserves only verified identities, quantities and current canonical prices', async () => {
  const path = new URL('../src/lib/cart.ts', import.meta.url)
  assert.ok(existsSync(path), 'pure cart migration must exist')
  const { restoreCart, cartTotal, cartSnapshot } = await import(path.href)
  const items = restoreCart([
    { id: 'C807601-36', qty: 2 }, { id: '919-4', qty: 10 },
    { id: '6011-2', qty: 1 }, { id: 'SLAT-PL', qty: 3 },
    { id: 'C807601-36', qty: 99 }, { id: 'unknown', qty: 1 },
    { id: '6652-71', qty: 10000 }, { id: '009-A229', qty: -1 },
    { id: '8225-6-B1', qty: 1, price: 1 },
  ])
  assert.deepEqual(items.map(x => [x.product.sku, x.qty]), [['C807601-36', 2], ['6011-2', 1]])
  assert.equal(cartTotal(items), 22000)
  const snapshot = cartSnapshot(items)
  assert.deepEqual(snapshot.map(x => Object.keys(x).sort()), [['id', 'qty'], ['id', 'qty']])
  assert.deepEqual(restoreCart(snapshot).map(x => x.qty), [2, 1])
  assert.deepEqual(restoreCart({ id: 'C807601-36', qty: 1 }), [])
  assert.deepEqual(restoreCart(null), [])
  assert.deepEqual(restoreCart([{ id: '6652-71', qty: Infinity }]), [])
})

test('catalog price changes propagate to cart and Telegram without historical cached prices', async () => {
  const path = new URL('../src/lib/cart.ts', import.meta.url)
  assert.ok(existsSync(path))
  const { restoreCart, cartTotal } = await import(path.href)
  const product = catalog.products.find(p => p.sku === 'C807601-36')
  assert.ok(product)
  const changed = { ...product, priceRub: 7100 }
  const items = restoreCart([{ id: product.id, qty: 2 }], [changed])
  assert.equal(cartTotal(items), 14200)
  const message = formatCartTelegramMessage(items)
  assert.match(message, /7 100 ₽ = 14 200 ₽/)
  assert.match(message, /Итого: 14 200 ₽/)
  assert.match(message, /C807601-36/)
  const unnamedSku = catalog.products.find(p => p.name === 'Ясень серый')
  assert.equal(unnamedSku.sku, null)
  assert.doesNotMatch(formatProductTelegramMessage(unnamedSku, 'Дерево'), /Артикул:|null|undefined|pdf2026/)
})

test('calculator gets area from actual sheet dimensions and excludes slats/profiles', () => {
  const sheet = catalog.products.find(p => p.sku === 'C807601-36')
  assert.ok(sheet)
  assert.deepEqual(calculatePanels('10', '2,5', '0', sheet), { valid: true, area: 25, sheets: 7 })
  assert.deepEqual(calculatePanels('10', '2.5', '0', { ...sheet, dimensions: { widthMm: 1000, lengthMm: 2000 } }), { valid: true, area: 25, sheets: 13 })
  for (const item of [null, catalog.products.find(p => p.kind === 'slat'), catalog.products.find(p => p.kind === 'profile')]) {
    assert.deepEqual(calculatePanels('10', '2.5', '0', item), { valid: false, area: 0, sheets: 0 })
  }
  assert.deepEqual(calculatePanels('', '2.5', '0', sheet), { valid: false, area: 0, sheets: 0 })
})

test('quiz recommendations have real categories and user-selectable published materials', async () => {
  const path = new URL('../src/lib/quiz.ts', import.meta.url)
  assert.ok(existsSync(path), 'quiz category rules must be testable')
  const { quizCategories } = await import(path.href)
  for (const ids of Object.values(quizCategories)) {
    assert.ok(ids.length)
    for (const id of ids) {
      assert.ok(catalog.collections.some(c => c.id === id))
      assert.ok(catalog.filterProducts(id, '').length)
    }
  }
  const quiz = readFileSync(new URL('../src/components/Quiz.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(quiz, /919-4|962-1|ryab-3d|JGFG-022|REC\[/)
})

test('all published commercial/specification fields agree with their individual source record', () => {
  assert.equal(catalog.sourceInventory.filter(p => p.name === null).length, 22)
  for (const product of catalog.products) {
    const source = catalog.sourceInventory.find(p => p.id === product.id)
    assert.ok(source)
    assert.equal(source.status, 'verified')
    for (const key of ['sku', 'priceRub', 'unit', 'thicknessMm', 'weightKg', 'material']) {
      assert.equal(product[key], source[key], product.id + ' ' + key)
    }
    assert.deepEqual(product.dimensions, source.dimensions)
    const details = catalog.productDetails(product)
    if (source.thicknessMm === undefined) assert.ok(!details.some(([label]) => label === 'Толщина'))
    if (source.weightKg === undefined) assert.ok(!details.some(([label]) => label === 'Вес'))
    if (source.sku === null) assert.ok(!details.some(([label]) => label === 'Артикул'))
    if (source.material === undefined) assert.ok(!details.some(([label]) => label === 'Материал'))
  }
})

test('PDF previews retain their documented crop dimensions without artificial enlargement', async () => {
  const { default: sharp } = await import('sharp')
  const previews = catalog.products.filter(p => p.imageStatus === 'pdf_preview')
  assert.equal(previews.length, 38)
  assert.equal(catalog.products.filter(p => p.imageStatus === 'confirmed_reused').length, 7)
  for (const p of previews) {
    const metadata = await sharp(fileURLToPath(new URL('../public/' + p.image, import.meta.url))).metadata()
    assert.equal(metadata.width, p.previewCrop[2] - p.previewCrop[0], p.id)
    assert.equal(metadata.height, p.previewCrop[3] - p.previewCrop[1], p.id)
  }
})


test('customer descriptions cover all categories without inventing material facts or exposing QA provenance', async () => {
  const { productDescription } = await import('../src/lib/productPresentation.ts')
  for (const product of catalog.products) {
    const text = productDescription(product)
    if (product.description?.trim()) assert.equal(text, product.description.trim())
    else assert.ok(text.length > 30, product.categoryId)
    assert.doesNotMatch(text, /PDF|каталога 2026|pdf2026|влагостой|акуст|огнестой|сертифиц/i)
  }
  assert.match(productDescription(catalog.products.find(p => p.categoryId === 'fabric')), /тканевой фактурой/)
  assert.match(productDescription({ categoryId: 'profiles', material: 'алюминий' }), /алюминия/)
  assert.doesNotMatch(productDescription({ categoryId: 'profiles' }), /алюминия/)
  assert.doesNotMatch(productDescription(catalog.products.find(p => p.kind === 'flexible_stone')), /бамбук|WPC|13 кг/i)
})


test('carousel presentation retains nine real category links and bounded source samples', async () => {
  const { categoryPresentation } = await import('../src/lib/categoryPresentation.ts')
  const { parseCatalogHash } = await import('../src/lib/catalogNavigation.ts')
  assert.deepEqual(categoryPresentation.map(c => c.id), catalog.collections.map(c => c.id))
  for (const category of categoryPresentation) {
    assert.equal(parseCatalogHash(category.href).categoryId, category.id)
    assert.equal(category.count, catalog.collections.find(c => c.id === category.id).count)
    assert.ok(existsSync(new URL('../public/' + category.image, import.meta.url)))
    assert.ok(category.evidence)
    if (category.mode === 'sample') {
      assert.ok(category.sampleMaxPx <= 220)
      assert.equal(category.image, catalog.products.find(p => p.categoryId === category.id).image)
    }
  }
  const page = readFileSync(new URL('../src/pages/CatalogPage.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(page, /compact-card-preview|PDF-превью/)
  assert.match(page, /compact-catalog-grid/)
  for (const file of ['../src/components/ProductModal.tsx', '../src/components/Quiz.tsx', '../src/components/CategoriesTeaser.tsx']) {
    assert.doesNotMatch(readFileSync(new URL(file, import.meta.url), 'utf8'), /PDF-превью|Превью из PDF|Характеристики по карточке каталога 2026/)
  }
  const workflow = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8')
  assert.ok(workflow.includes('npm run test:catalog'))
  assert.ok(workflow.indexOf('npm run test:catalog') < workflow.indexOf('name: Upload artifact'))
})

test('confirmed individual description takes priority over safe category fallback', async () => {
  const { productDescription } = await import('../src/lib/productPresentation.ts')
  assert.equal(productDescription({ categoryId: 'profiles', description: 'Соединительный — бронза' }), 'Соединительный — бронза')
  assert.match(productDescription({ categoryId: 'fabric', description: '  ' }), /тканевой фактурой/)
})
