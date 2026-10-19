import { collections, products } from '../data/products.ts'
import { updateCatalogHash } from './catalogNavigation.ts'
import { productDescription } from './productPresentation.ts'

// Owner-supplied category scenes illustrate a family, never a specific SKU.
export const categoryPresentation = collections.map(collection => {
  const product = products.find(p => p.categoryId === collection.id)!
  return {
    ...collection,
    href: updateCatalogHash('#/catalog', { category: collection.id }),
    image: `catalog/categories/carousel-2026-${collection.id}.webp`,
    imagePosition: collection.id === 'profiles' ? 'right bottom' : 'center',
    copy: productDescription({ categoryId: collection.id, material: product.material }),
    evidence: 'Owner-supplied category illustration; see DESIGN-17S-CATEGORY-IMAGES.md. Not SKU evidence.',
  }
})
