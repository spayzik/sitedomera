import type { CollectionId } from '../data/products.ts'

// Aesthetic preference narrows categories. Room/budget do not establish technical suitability.
export const quizCategories: Readonly<Record<string, readonly CollectionId[]>> = {
  cozy: ['wood', 'fabric', 'soft'],
  minimal: ['soft', 'bamboo_stone', 'plaster'],
  metal: ['metal'],
  stone: ['flexible_stone', 'bamboo_stone'],
}
