import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CONTACTS, products } from '../src/data/products.ts'
import { buildTelegramDraftUrl, formatCartTelegramMessage } from '../src/lib/telegramLink.ts'

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
