export type CollectionId = 'wood' | 'fabric' | 'metal' | 'bamboo_stone' | 'soft' | 'flexible_stone' | 'plaster' | 'slats' | 'profiles'
export type ProductKind = 'panel' | 'flexible_stone' | 'slat' | 'profile'
export interface Dimensions { lengthMm: number; widthMm?: number }
export interface SourceProduct {
  id: string
  sku: string | null
  skuReview?: string
  name: string | null
  variant?: string
  categoryId: CollectionId
  kind: ProductKind
  priceRub: number
  unit: 'шт' | 'лист'
  dimensions: Dimensions
  thicknessMm?: number
  weightKg?: number
  material?: string
  description?: string
  source: { pdfPage: number; slot: string }
  status: 'verified' | 'owner_review_required'
  image: string | null
  imageStatus: 'confirmed_reused' | 'pdf_preview' | 'unavailable'
  imageEvidence: string
  previewCrop?: readonly number[]
}
export interface Product extends Omit<SourceProduct, 'name' | 'image' | 'status'> {
  name: string
  image: string
  swatch: string
  availabilityStatus?: 'confirmed'
}
export interface Collection {
  id: CollectionId
  name: string
  nameEn: string
  description: string
  banner: string
  count: number
}
