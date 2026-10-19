import { collections } from '../data/products.ts'
import { updateCatalogHash } from './catalogNavigation.ts'

// Owner-supplied category scenes illustrate a family, never a specific SKU.
export const categoryPresentation = collections.map(collection => {
  return {
    ...collection,
    href: updateCatalogHash('#/catalog', { category: collection.id }),
    image: `catalog/categories/carousel-2026-${collection.id}.webp`,
    imagePosition: collection.id === 'profiles' ? 'right bottom' : 'center',
    evidence: 'Owner-supplied category illustration; see DESIGN-17S-CATEGORY-IMAGES.md. Not SKU evidence.',
  }
})
