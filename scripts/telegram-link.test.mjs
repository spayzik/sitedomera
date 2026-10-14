import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CONTACTS, collections, products } from '../src/data/products.ts'
import {
  buildTelegramDraftUrl,
  formatCalculatorTelegramMessage,
  formatCartTelegramMessage,
  formatProductTelegramMessage,
  formatQuizTelegramMessage,
} from '../src/lib/telegramLink.ts'

test('two catalog products produce a Telegram draft with current prices and total', () => {
  const oak = products.find((product) => product.name === 'Ясень песочный')
  const bronze = products.find((product) => product.name === 'Карамель')
  assert.ok(oak)
  assert.ok(bronze)

  const message = formatCartTelegramMessage([
    { product: oak, qty: 10 },
    { product: bronze, qty: 10 },
  ])
  const url = new URL(buildTelegramDraftUrl(CONTACTS.telegram, message))

  assert.equal(url.hostname, 't.me')
  assert.equal(url.pathname, '/domeraru')
  assert.equal(url.searchParams.get('text'), [
    'Здравствуйте! Заинтересовался товарами на сайте Домэра:',
    '',
    '1. Ясень песочный (C807601-36) — 10 шт. × 7 000 ₽ = 70 000 ₽',
    '2. Карамель (6011-2) — 10 шт. × 8 000 ₽ = 80 000 ₽',
    '',
    'Итого: 150 000 ₽',
    '',
    'Подскажите, пожалуйста, по наличию и доставке.',
  ].join('\n'))
})

test('Cyrillic, currency, ampersand, question mark, hash and newline survive URL encoding', () => {
  const message = 'Материал Дуб & Бронза? #1\nЦена: 6 000 ₽'
  const url = new URL(buildTelegramDraftUrl(CONTACTS.telegram, message))

  assert.equal(url.hostname, 't.me')
  assert.equal(url.searchParams.get('text'), message)
  assert.equal(url.hash, '')
})

test('empty selection produces no draft and untrusted destinations are rejected', () => {
  assert.equal(formatCartTelegramMessage([]), '')
  assert.throws(() => buildTelegramDraftUrl('https://example.com/domeraru', 'Hello'))
  assert.throws(() => buildTelegramDraftUrl('javascript:alert(1)', 'Hello'))
})

test('calculator draft uses the supplied area, panel, sheet count and total', () => {
  const panel = products.find((product) => product.sku === 'C807601-36')
  assert.ok(panel)
  const message = formatCalculatorTelegramMessage({ area: 25, sheets: 7, panel, total: 49_000 })
  const url = new URL(buildTelegramDraftUrl(CONTACTS.telegram, message))

  assert.equal(url.hostname, 't.me')
  assert.equal(url.searchParams.get('text'), [
    'Здравствуйте! Сделал расчёт на сайте Домэра.',
    '',
    'Площадь стен: 25 м²',
    'Материал: Ясень песочный',
    'Артикул: C807601-36',
    'Количество: 7 лист.',
    'Цена материала: 7 000 ₽/шт.',
    'Ориентировочная стоимость: 49 000 ₽',
    '',
    'Хочу уточнить точный расчёт с профилями и наличие.',
  ].join('\n'))
})

test('quiz draft contains the recommendation and no quiz answers', () => {
  const product = products.find((item) => item.sku === 'C807601-36')
  assert.ok(product)
  const collection = collections.find((item) => item.id === product.categoryId)?.name
  assert.equal(collection, 'Дерево')
  const message = formatQuizTelegramMessage(product, collection)
  const url = new URL(buildTelegramDraftUrl(CONTACTS.telegram, message))

  assert.equal(url.hostname, 't.me')
  assert.equal(url.searchParams.get('text'), [
    'Здравствуйте! Прошёл подбор на сайте Домэра.',
    '',
    'Выбрал материал после подбора категории:',
    'Ясень песочный',
    'Артикул: C807601-36',
    'Коллекция: Дерево',
    'Размер: 1220 × 3000 мм',
    'Цена: 7 000 ₽/шт.',
    '',
    'Хочу уточнить наличие и детали.',
  ].join('\n'))
  assert.doesNotMatch(message, /Гостиная|Тёплый уют|60 000/)
})

test('product draft describes the selected panel without cart contents', () => {
  const product = products.find((item) => item.name === 'Карамель')
  assert.ok(product)
  const collection = collections.find((item) => item.id === product.categoryId)?.name
  assert.equal(collection, 'Софт-тач')
  const message = formatProductTelegramMessage(product, collection)
  const url = new URL(buildTelegramDraftUrl(CONTACTS.telegram, message))

  assert.equal(url.hostname, 't.me')
  assert.equal(url.searchParams.get('text'), [
    'Здравствуйте! Заинтересовался товаром на сайте Домэра:',
    '',
    'Карамель',
    'Артикул: 6011-2',
    'Коллекция: Софт-тач',
    'Размер: 1220 × 3000 мм',
    'Цена: 8 000 ₽/шт.',
    '',
    'Подскажите, пожалуйста, по наличию и доставке.',
  ].join('\n'))
  assert.doesNotMatch(message, /Итого:|Количество:/)
})
