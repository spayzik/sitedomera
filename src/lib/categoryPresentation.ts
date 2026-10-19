import { collections, products } from '../data/products.ts'
import type { CollectionId } from '../data/catalogModel.ts'
import { updateCatalogHash } from './catalogNavigation.ts'
import { productDescription } from './productPresentation.ts'

// Editorial scenes illustrate a family, never a specific SKU or installation claim.
const editorialImages: Partial<Record<CollectionId, string>> = {
  wood: 'carusel-bamboo.webp', fabric: 'carusel-cotton.webp',
  soft: 'carusel-softtouch.webp', flexible_stone: 'carusel-stone.webp',
  slats: 'carusel-reech.webp',
}

export const categoryPresentation = collections.map(collection => {
  const product = products.find(p => p.categoryId === collection.id)!
  const editorial = editorialImages[collection.id]
  return {
    ...collection,
    href: updateCatalogHash('#/catalog', { category: collection.id }),
    image: editorial ? 'catalog/categories/' + editorial : product.image,
    mode: editorial ? 'editorial' as const : 'sample' as const,
    sampleMaxPx: 220,
    copy: productDescription({ categoryId: collection.id, material: product.material }),
    evidence: editorial
      ? 'Original editorial scene, c1a7179; family correspondence, not SKU evidence.'
      : product.imageEvidence,
  }
})
