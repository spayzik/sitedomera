import { collections, type CollectionId } from '../data/products.ts'
import { updateCatalogHash } from './catalogNavigation.ts'

const categoryCopy: Record<CollectionId, string> = {
  wood: 'Древесные фактуры и спокойные оттенки для выразительной отделки интерьера.',
  fabric: 'Тканевые фактуры с рисунком переплетения для мягких интерьерных акцентов.',
  metal: 'Металлические оттенки и выразительная поверхность для акцентной отделки.',
  bamboo_stone: 'Бамбуковые панели с фактурой камня для выразительных интерьерных решений.',
  soft: 'Фактуры серии софт-тач для спокойных и лаконичных интерьерных композиций.',
  flexible_stone: 'Выразительные каменные фактуры для декоративного оформления стен.',
  plaster: 'Сдержанные фактуры штукатурки для лаконичной отделки интерьера.',
  slats: 'Вертикальный ритм и рельеф для выразительных интерьерных акцентов.',
  profiles: 'Профили и комплектующие для аккуратного оформления краёв и стыков.',
}

// Owner-supplied category scenes illustrate a family, never a specific SKU.
export const categoryPresentation = collections.map(collection => {
  return {
    ...collection,
    shortDescription: categoryCopy[collection.id],
    href: updateCatalogHash('#/catalog', { category: collection.id }),
    image: `catalog/categories/carousel-2026-${collection.id}.webp`,
    imagePosition: collection.id === 'profiles' ? 'right bottom' : 'center',
    evidence: 'Owner-supplied category illustration; see DESIGN-17S-CATEGORY-IMAGES.md. Not SKU evidence.',
  }
})
