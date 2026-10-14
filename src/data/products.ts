import type { Product, Collection, CollectionId } from './catalogModel.ts'
import { sourceInventory } from './catalog2026.ts'
export type { Product, Collection, CollectionId, ProductKind, SourceProduct } from './catalogModel.ts'
export { sourceInventory, catalogSource } from './catalog2026.ts'

// Public names use only source labels, variant subtitles, or the official SKU.
export const products: Product[] = sourceInventory
  .filter(p => p.status === 'verified' && p.image !== null && (p.name !== null || p.sku !== null))
  .map(({ status: _status, ...p }) => ({
    ...p,
    name: p.variant ? `${p.name} — ${p.variant}` : p.name ?? p.sku!,
    image: p.image!,
    swatch: p.image!,
  }))

const categoryNames: Record<CollectionId, [string, string]> = {
  wood: ['Дерево', 'Wood Series'],
  fabric: ['Ткань', 'Fabric Series'],
  metal: ['Металл', 'Metal Series'],
  bamboo_stone: ['Бамбук под камень', 'Bamboo Stone'],
  soft: ['Софт-тач', 'Soft Touch'],
  flexible_stone: ['Гибкий камень', 'Flexible Stone'],
  plaster: ['Штукатурка', 'Plaster Series'],
  slats: ['Декоративные рейки', 'Decorative Slats'],
  profiles: ['Профиль и комплектующие', 'Profiles & Trims'],
}

export const collections: Collection[] = (Object.keys(categoryNames) as CollectionId[]).map(id => {
  const items = products.filter(p => p.categoryId === id)
  const [name, nameEn] = categoryNames[id]
  return { id, name, nameEn, description: `${name}: позиции каталога Домэра 2026. Характеристики и цена указаны в карточке каждого изделия.`, banner: items[0].image, count: items.length }
})

export function filterProducts(category: CollectionId | 'all', search: string): Product[] {
  const q = search.trim().toLocaleLowerCase('ru-RU')
  return products.filter(p => (category === 'all' || p.categoryId === category) &&
    (!q || p.name.toLocaleLowerCase('ru-RU').includes(q) || p.sku?.toLocaleLowerCase('ru-RU').includes(q)))
}

export function formatDimensions(p: Product): string {
  return p.dimensions.widthMm !== undefined
    ? `${p.dimensions.widthMm} × ${p.dimensions.lengthMm} мм`
    : `Длина ${p.dimensions.lengthMm} мм`
}

export function productDetails(p: Product): [string, string][] {
  const details: [string, string][] = [
    ['Категория', collections.find(c => c.id === p.categoryId)!.name],
    ['Размеры', formatDimensions(p)],
  ]
  if (p.sku) details.splice(1, 0, ['Артикул', p.sku])
  if (p.thicknessMm !== undefined) details.push(['Толщина', `${p.thicknessMm.toLocaleString('ru-RU')} мм`])
  if (p.weightKg !== undefined) details.push(['Вес', `${p.weightKg.toLocaleString('ru-RU')} кг`])
  if (p.material) details.push(['Материал', p.material])
  return details
}

export const sheetProducts = products.filter(p => (p.kind === 'panel' || p.kind === 'flexible_stone') && p.dimensions.widthMm !== undefined)
const panels = products.filter(p => p.kind === 'panel')
const range = (values: number[]) => ({ min: Math.min(...values), max: Math.max(...values) })
export const catalogSummary = {
  productCount: products.length,
  categoryCount: collections.length,
  sheetWidth: range(sheetProducts.map(p => p.dimensions.widthMm!)),
  panelThickness: range(panels.flatMap(p => p.thicknessMm === undefined ? [] : [p.thicknessMm])),
  panelWeight: range(panels.flatMap(p => p.weightKg === undefined ? [] : [p.weightKg])),
  sheetLength: range(sheetProducts.map(p => p.dimensions.lengthMm)),
}
export const formatRange = ({ min, max }: { min: number; max: number }) =>
  min === max ? min.toLocaleString('ru-RU') : `${min.toLocaleString('ru-RU')}–${max.toLocaleString('ru-RU')}`

export const priceSummary = collections.map(c => {
  const items = products.filter(p => p.categoryId === c.id)
  return `${c.name}: ${formatRange(range(items.map(p => p.priceRub)))} ₽/${items[0].unit}`
}).join('; ')

// Only exact official SKU + visually checked source-image correspondences.
export const legacyCartIds: Readonly<Record<string, string>> = {
  "C807601-36": "pdf2026-p06-r1c2",
  "671-A227": "pdf2026-p09-r1c1",
  "8225-6-B1": "pdf2026-p09-r1c2",
  "8305-W": "pdf2026-p09-r2c1",
  "6011-2": "pdf2026-p17-r1c2",
  "6652-71": "pdf2026-p23-r1c1",
  "009-A229": "pdf2026-p23-r1c2"
}

const hostname = 'xn--80ahyhl1f.xn--p1ai'
const city = 'Москва'
const streetAddress = 'Алтуфьевское ш., 37с1'

export const CONTACTS = {
  brand: 'Домэра',
  phone: '+7 977 476-08-88',
  phoneRaw: '+79774760888',
  avito: 'https://www.avito.ru/brands/i344978249',
  site: 'домэра.рф',
  hostname,
  origin: `https://${hostname}`,
  telegram: 'https://t.me/domeraru',
  telegramChannel: 'https://t.me/domerarf',
  city,
  streetAddress,
  address: `${city}, ${streetAddress}`,
  hours: 'Ежедневно 11:00–20:00 (без записи)',
  openingHours: 'Mo-Su 11:00-20:00',
  delivery: 'Самовывоз или отправка в день заказа',
}



export const faq = [
  { q: 'Какие материалы и размеры есть в каталоге?', a: `В каталоге ${products.length} позиций в ${collections.length} категориях: панели, гибкий камень, рейки и алюминиевые профили. Размер, толщина и масса зависят от изделия; смотрите конкретную карточку. Наличие уточняет менеджер.` },
  { q: 'Как осуществляется доставка?', a: 'Способ доставки, стоимость и сроки уточните у менеджера для выбранных материалов. Адрес шоурума указан в контактах.' },
  { q: 'Сколько стоят материалы?', a: `${priceSummary}. Это цены каталога 2026; наличие и условия покупки уточните у менеджера.` },
  { q: 'Как монтируются материалы?', a: 'Способ монтажа и комплектующие зависят от выбранного материала. Уточните совместимость профиля с толщиной панели и рекомендации для вашего основания.' },
  { q: 'Где можно применять материалы?', a: 'Каталог предлагает фактуры для жилых и коммерческих интерьеров. Пригодность для влажных зон и других специальных условий нужно подтвердить для конкретного изделия.' },
  { q: 'Нужно ли записываться в шоурум?', a: `Приезжайте без записи. ${CONTACTS.hours}. Наличие нужного образца и товара можно уточнить заранее в Telegram или по телефону.` },
]
