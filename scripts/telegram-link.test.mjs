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
  const oak = products.find((product) => product.name === 'Дуб натуральный')
  const bronze = products.find((product) => product.name === 'Бронзовый')
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
    '1. Дуб натуральный — 10 шт. × 6 000 ₽ = 60 000 ₽',
    '2. Бронзовый — 10 шт. × 6 000 ₽ = 60 000 ₽',
    '',
    'Итого: 120 000 ₽',
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
  const panel = products.find((product) => product.sku === '919-4')
  assert.ok(panel)
  const message = formatCalculatorTelegramMessage({ area: 25, sheets: 7, panel, total: 42_000 })
  const url = new URL(buildTelegramDraftUrl(CONTACTS.telegram, message))

  assert.equal(url.hostname, 't.me')
  assert.equal(url.searchParams.get('text'), [
    'Здравствуйте! Сделал расчёт на сайте Домэра.',
    '',
    'Площадь стен: 25 м²',
    'Материал: Дуб натуральный',
    'Артикул: 919-4',
    'Количество: 7 шт.',
    'Цена панели: 6 000 ₽',
    'Ориентировочная стоимость: 42 000 ₽',
    '',
    'Хочу уточнить точный расчёт с профилями и наличие.',
  ].join('\n'))
})

test('quiz draft contains the recommendation and no quiz answers', () => {
  const product = products.find((item) => item.sku === '919-4')
  assert.ok(product)
  const collection = collections.find((item) => item.id === product.collection)?.name
  assert.equal(collection, 'Дерево')
  const message = formatQuizTelegramMessage(product, collection)
  const url = new URL(buildTelegramDraftUrl(CONTACTS.telegram, message))

  assert.equal(url.hostname, 't.me')
  assert.equal(url.searchParams.get('text'), [
    'Здравствуйте! Прошёл подбор на сайте Домэра.',
    '',
    'Мне подошёл материал:',
    'Дуб натуральный',
    'Артикул: 919-4',
    'Коллекция: Дерево',
    'Размер: 1220 × 3000 мм',
    'Цена: 6 000 ₽/шт.',
    '',
    'Хочу уточнить наличие и детали.',
  ].join('\n'))
  assert.doesNotMatch(message, /Гостиная|Тёплый уют|60 000/)
})

test('product draft describes the selected panel without cart contents', () => {
  const product = products.find((item) => item.name === 'Бронзовый')
  assert.ok(product)
  const collection = collections.find((item) => item.id === product.collection)?.name
  assert.equal(collection, 'Однотон')
  const message = formatProductTelegramMessage(product, collection)
  const url = new URL(buildTelegramDraftUrl(CONTACTS.telegram, message))

  assert.equal(url.hostname, 't.me')
  assert.equal(url.searchParams.get('text'), [
    'Здравствуйте! Заинтересовался товаром на сайте Домэра:',
    '',
    'Бронзовый',
    'Артикул: 002-A229',
    'Коллекция: Однотон',
    'Размер: 1220 × 3000 мм',
    'Цена: 6 000 ₽/шт.',
    '',
    'Подскажите, пожалуйста, по наличию и доставке.',
  ].join('\n'))
  assert.doesNotMatch(message, /Итого:|Количество:/)
})
