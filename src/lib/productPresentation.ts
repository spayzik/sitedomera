import type { CollectionId, Product } from '../data/catalogModel.ts'

const descriptions: Record<Exclude<CollectionId, 'profiles'>, string> = {
  wood: 'Стеновая панель с древесной фактурой для акцентной отделки интерьера.',
  fabric: 'Декоративная панель с тканевой фактурой для интерьерного оформления.',
  metal: 'Декоративная стеновая панель с металлической фактурой.',
  bamboo_stone: 'Стеновая панель с фактурой камня для декоративной отделки интерьера.',
  soft: 'Декоративная панель коллекции «Софт-тач» для интерьерного оформления.',
  flexible_stone: 'Гибкий камень с выразительной фактурой для декоративных интерьерных решений.',
  plaster: 'Декоративная панель с фактурой штукатурки для интерьерного оформления.',
  slats: 'Декоративная рейка для интерьерных композиций.',
}

// Presentation copy is separate from the immutable PDF inventory and its review status.
export function productDescription(product: Pick<Product, 'categoryId' | 'material' | 'description'>): string {
  const individual = product.description?.trim()
  if (individual) return individual
  if (product.categoryId === 'profiles') {
    return product.material === 'алюминий'
      ? 'Профиль из алюминия для декоративного оформления панелей.'
      : 'Декоративный профиль для оформления панелей.'
  }
  return descriptions[product.categoryId]
}
