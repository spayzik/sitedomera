import { collections, products } from './products.ts'

export const publicReleaseFiles = new Set([
  'favicon.svg', 'robots.txt', 'sitemap.xml', 'catalog/og-cover.jpg',
  'generated/avito-reviews.json', 'fonts/fonts.css',
  'fonts/cormorant-400-4.woff2', 'fonts/cormorant-400-5.woff2',
  'fonts/cormorant-400-italic-0.woff2', 'fonts/cormorant-400-italic-1.woff2',
  'fonts/inter-300-12.woff2', 'fonts/inter-300-13.woff2',
  'fonts/unbounded-300-22.woff2', 'fonts/unbounded-300-23.woff2',
  'catalog/hero/hero.webp', 'catalog/hero/hero-catalog.webp', 'catalog/rooms/montage.webp',
  ...['living', 'bedroom', 'dining', 'metal', 'fabric'].map(id => 'catalog/rooms/interior-' + id + '.webp'),
  ...['living', 'bedroom', 'dining', 'metal', 'fabric'].map(id => 'catalog/rooms/interior-' + id + '-480.webp'),
  'catalog/rooms/concept-wood.webp', 'catalog/rooms/concept-wood-small.webp',
  ...collections.map(({ id }) => 'catalog/hero/collection-' + id + '.webp'),
  'catalog/hero/collection-bamboo_stone-mobile.webp',
  'catalog/hero/collection-flexible_stone-mobile.webp',
  'catalog/hero/collection-metal-mobile.webp',
  'catalog/hero/collection-plaster-mobile.webp',
  'catalog/hero/collection-slats-mobile.webp',
  'catalog/hero/collection-soft-mobile.webp',
  'catalog/hero/collection-wood-mobile.webp',
  ...collections.map(({ id }) => 'catalog/categories/carousel-2026-' + id + '.webp'),
  ...products.map(({ image }) => image),
])

// Public legal documents are optional while the associated service is disabled.
export const optionalPublicReleaseFiles = new Set(['legal/lead-consent.html'])
