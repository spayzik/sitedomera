import type { SourceProduct } from './catalogModel.ts'

export const catalogSource = {
  filename: 'ДОМЭРА_каталог.pdf',
  pages: 27,
  sha256: 'd517116b7b856e8f1637a0f5415a8f7ef82ea4c12e213a5ae8ad0efe430bc626',
  reviewedAt: '2026-10-14',
} as const

// Independently checked against each PDF card. Unknown facts remain absent.
export const sourceInventory: readonly SourceProduct[] = [
  {
    "id": "pdf2026-p06-r1c1",
    "sku": null,
    "name": "Ясень серый",
    "categoryId": "wood",
    "kind": "panel",
    "priceRub": 7000,
    "unit": "шт",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 6,
      "slot": "r1c1"
    },
    "status": "verified",
    "thicknessMm": 5,
    "weightKg": 13,
    "image": "catalog/2026/previews/p06-r1c1.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      60,
      273,
      314,
      567
    ],
    "imageEvidence": "PDF p6 r1c1; crop from inspected page render below badge and above caption; 254x294px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p06-r1c2",
    "sku": "C807601-36",
    "name": "Ясень песочный",
    "categoryId": "wood",
    "kind": "panel",
    "priceRub": 7000,
    "unit": "шт",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 6,
      "slot": "r1c2"
    },
    "status": "verified",
    "thicknessMm": 5,
    "weightKg": 13,
    "image": "catalog/products/C807601-36.webp",
    "imageStatus": "confirmed_reused",
    "imageEvidence": "PDF p6 r1c2: exact SKU C807601-36; visual comparison with existing texture/object. Original photo resolution not certified."
  },
  {
    "id": "pdf2026-p06-r1c3",
    "sku": null,
    "name": "Орех дымчатый",
    "categoryId": "wood",
    "kind": "panel",
    "priceRub": 7000,
    "unit": "шт",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 6,
      "slot": "r1c3"
    },
    "status": "verified",
    "skuReview": "7189A237AI ? 7189A237A1",
    "thicknessMm": 5,
    "weightKg": 13,
    "image": "catalog/2026/previews/p06-r1c3.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      629,
      273,
      883,
      567
    ],
    "imageEvidence": "PDF p6 r1c3; crop from inspected page render below badge and above caption; 254x294px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p06-r2c1",
    "sku": null,
    "name": "Серая ёлка",
    "categoryId": "wood",
    "kind": "panel",
    "priceRub": 7000,
    "unit": "шт",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 6,
      "slot": "r2c1"
    },
    "status": "verified",
    "thicknessMm": 5,
    "weightKg": 13,
    "image": "catalog/2026/previews/p06-r2c1.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      60,
      769,
      314,
      1056
    ],
    "imageEvidence": "PDF p6 r2c1; crop from inspected page render below badge and above caption; 254x287px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p06-r2c2",
    "sku": null,
    "name": "Дуб пепельный",
    "categoryId": "wood",
    "kind": "panel",
    "priceRub": 7000,
    "unit": "шт",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 6,
      "slot": "r2c2"
    },
    "status": "verified",
    "thicknessMm": 5,
    "weightKg": 13,
    "image": "catalog/2026/previews/p06-r2c2.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      347,
      769,
      596,
      1056
    ],
    "imageEvidence": "PDF p6 r2c2; crop from inspected page render below badge and above caption; 249x287px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p06-r2c3",
    "sku": null,
    "name": "Дуб светлый",
    "categoryId": "wood",
    "kind": "panel",
    "priceRub": 7000,
    "unit": "шт",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 6,
      "slot": "r2c3"
    },
    "status": "verified",
    "thicknessMm": 5,
    "weightKg": 13,
    "image": "catalog/2026/previews/p06-r2c3.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      629,
      769,
      883,
      1056
    ],
    "imageEvidence": "PDF p6 r2c3; crop from inspected page render below badge and above caption; 254x287px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p07-r1c1",
    "sku": "A9009",
    "name": null,
    "categoryId": "wood",
    "kind": "panel",
    "priceRub": 7000,
    "unit": "шт",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 7,
      "slot": "r1c1"
    },
    "status": "verified",
    "thicknessMm": 7,
    "weightKg": 18,
    "image": "catalog/2026/previews/p07-r1c1.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      60,
      270,
      314,
      563
    ],
    "imageEvidence": "PDF p7 r1c1; crop from inspected page render below badge and above caption; 254x293px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p07-r1c2",
    "sku": "8840-M",
    "name": null,
    "categoryId": "wood",
    "kind": "panel",
    "priceRub": 7000,
    "unit": "шт",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 7,
      "slot": "r1c2"
    },
    "status": "verified",
    "thicknessMm": 7,
    "weightKg": 18,
    "image": "catalog/2026/previews/p07-r1c2.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      347,
      270,
      596,
      563
    ],
    "imageEvidence": "PDF p7 r1c2; crop from inspected page render below badge and above caption; 249x293px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p07-r1c3",
    "sku": "A9014",
    "name": null,
    "categoryId": "wood",
    "kind": "panel",
    "priceRub": 7000,
    "unit": "шт",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 7,
      "slot": "r1c3"
    },
    "status": "verified",
    "thicknessMm": 7,
    "weightKg": 18,
    "image": "catalog/2026/previews/p07-r1c3.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      629,
      270,
      883,
      563
    ],
    "imageEvidence": "PDF p7 r1c3; crop from inspected page render below badge and above caption; 254x293px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p07-r2c1",
    "sku": "8326-S",
    "name": null,
    "categoryId": "wood",
    "kind": "panel",
    "priceRub": 7000,
    "unit": "шт",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 7,
      "slot": "r2c1"
    },
    "status": "verified",
    "thicknessMm": 7,
    "weightKg": 18,
    "image": "catalog/2026/previews/p07-r2c1.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      60,
      761,
      314,
      1051
    ],
    "imageEvidence": "PDF p7 r2c1; crop from inspected page render below badge and above caption; 254x290px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p07-r2c2",
    "sku": "8313-S",
    "name": null,
    "categoryId": "wood",
    "kind": "panel",
    "priceRub": 7000,
    "unit": "шт",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 7,
      "slot": "r2c2"
    },
    "status": "verified",
    "thicknessMm": 7,
    "weightKg": 18,
    "image": "catalog/2026/previews/p07-r2c2.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      347,
      761,
      596,
      1051
    ],
    "imageEvidence": "PDF p7 r2c2; crop from inspected page render below badge and above caption; 249x290px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p09-r1c1",
    "sku": "671-A227",
    "name": "Рогожка белая",
    "categoryId": "fabric",
    "kind": "panel",
    "priceRub": 7000,
    "unit": "лист",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 9,
      "slot": "r1c1"
    },
    "status": "verified",
    "thicknessMm": 5,
    "weightKg": 13,
    "image": "catalog/products/671-A227.webp",
    "imageStatus": "confirmed_reused",
    "imageEvidence": "PDF p9 r1c1: exact SKU 671-A227; visual comparison with existing texture/object. Original photo resolution not certified."
  },
  {
    "id": "pdf2026-p09-r1c2",
    "sku": "8225-6-B1",
    "name": "Лён кремовый",
    "categoryId": "fabric",
    "kind": "panel",
    "priceRub": 7000,
    "unit": "лист",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 9,
      "slot": "r1c2"
    },
    "status": "verified",
    "thicknessMm": 5,
    "weightKg": 13,
    "image": "catalog/products/8225-6-B1.webp",
    "imageStatus": "confirmed_reused",
    "imageEvidence": "PDF p9 r1c2: exact SKU 8225-6-B1; visual comparison with existing texture/object. Original photo resolution not certified."
  },
  {
    "id": "pdf2026-p09-r2c1",
    "sku": "8305-W",
    "name": "Лён светло-серый",
    "categoryId": "fabric",
    "kind": "panel",
    "priceRub": 7000,
    "unit": "лист",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 9,
      "slot": "r2c1"
    },
    "status": "verified",
    "thicknessMm": 5,
    "weightKg": 13,
    "image": "catalog/products/8305-W.webp",
    "imageStatus": "confirmed_reused",
    "imageEvidence": "PDF p9 r2c1: exact SKU 8305-W; visual comparison with existing texture/object. Original photo resolution not certified."
  },
  {
    "id": "pdf2026-p10-r1c1",
    "sku": "8139-P",
    "name": null,
    "categoryId": "fabric",
    "kind": "panel",
    "priceRub": 8000,
    "unit": "лист",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 10,
      "slot": "r1c1"
    },
    "status": "verified",
    "thicknessMm": 7,
    "weightKg": 18,
    "image": "catalog/2026/previews/p10-r1c1.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      65,
      259,
      452,
      598
    ],
    "imageEvidence": "PDF p10 r1c1; crop from inspected page render below badge and above caption; 387x339px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p10-r1c2",
    "sku": "8141-P",
    "name": null,
    "categoryId": "fabric",
    "kind": "panel",
    "priceRub": 8000,
    "unit": "лист",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 10,
      "slot": "r1c2"
    },
    "status": "verified",
    "thicknessMm": 7,
    "weightKg": 18,
    "image": "catalog/2026/previews/p10-r1c2.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      493,
      259,
      878,
      598
    ],
    "imageEvidence": "PDF p10 r1c2; crop from inspected page render below badge and above caption; 385x339px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p10-r2c1",
    "sku": "A9001",
    "name": null,
    "categoryId": "fabric",
    "kind": "panel",
    "priceRub": 8000,
    "unit": "лист",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 10,
      "slot": "r2c1"
    },
    "status": "verified",
    "thicknessMm": 7,
    "weightKg": 18,
    "image": "catalog/2026/previews/p10-r2c1.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      65,
      766,
      452,
      1097
    ],
    "imageEvidence": "PDF p10 r2c1; crop from inspected page render below badge and above caption; 387x331px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p10-r2c2",
    "sku": "A9003",
    "name": null,
    "categoryId": "fabric",
    "kind": "panel",
    "priceRub": 8000,
    "unit": "лист",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 10,
      "slot": "r2c2"
    },
    "status": "verified",
    "thicknessMm": 7,
    "weightKg": 18,
    "image": "catalog/2026/previews/p10-r2c2.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      493,
      766,
      878,
      1097
    ],
    "imageEvidence": "PDF p10 r2c2; crop from inspected page render below badge and above caption; 385x331px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p11-r1c1",
    "sku": "8111-P",
    "name": null,
    "categoryId": "fabric",
    "kind": "panel",
    "priceRub": 8000,
    "unit": "лист",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 11,
      "slot": "r1c1"
    },
    "status": "verified",
    "thicknessMm": 7,
    "weightKg": 18,
    "image": "catalog/2026/previews/p11-r1c1.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      65,
      259,
      451,
      583
    ],
    "imageEvidence": "PDF p11 r1c1; crop from inspected page render below badge and above caption; 386x324px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p11-r1c2",
    "sku": "8021-P",
    "name": null,
    "categoryId": "fabric",
    "kind": "panel",
    "priceRub": 8000,
    "unit": "лист",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 11,
      "slot": "r1c2"
    },
    "status": "verified",
    "thicknessMm": 7,
    "weightKg": 18,
    "image": "catalog/2026/previews/p11-r1c2.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      494,
      259,
      880,
      583
    ],
    "imageEvidence": "PDF p11 r1c2; crop from inspected page render below badge and above caption; 386x324px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p11-r2c1",
    "sku": "A9005",
    "name": null,
    "categoryId": "fabric",
    "kind": "panel",
    "priceRub": 8000,
    "unit": "лист",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 11,
      "slot": "r2c1"
    },
    "status": "verified",
    "thicknessMm": 7,
    "weightKg": 18,
    "image": "catalog/2026/previews/p11-r2c1.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      65,
      768,
      451,
      1091
    ],
    "imageEvidence": "PDF p11 r2c1; crop from inspected page render below badge and above caption; 386x323px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p11-r2c2",
    "sku": null,
    "name": null,
    "categoryId": "fabric",
    "kind": "panel",
    "priceRub": 8000,
    "unit": "лист",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 11,
      "slot": "r2c2"
    },
    "status": "owner_review_required",
    "thicknessMm": 7,
    "weightKg": 18,
    "image": null,
    "imageStatus": "unavailable",
    "imageEvidence": "PDF p11 r2c2: identity unresolved; no public image or orderable product."
  },
  {
    "id": "pdf2026-p13-r1c1",
    "sku": "JSPJ-5012",
    "name": null,
    "categoryId": "metal",
    "kind": "panel",
    "priceRub": 8000,
    "unit": "лист",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 13,
      "slot": "r1c1"
    },
    "status": "verified",
    "thicknessMm": 8,
    "weightKg": 18,
    "image": "catalog/2026/previews/p13-r1c1.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      66,
      258,
      451,
      590
    ],
    "imageEvidence": "PDF p13 r1c1; crop from inspected page render below badge and above caption; 385x332px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p13-r1c2",
    "sku": "JSPJ-6043",
    "name": null,
    "categoryId": "metal",
    "kind": "panel",
    "priceRub": 8000,
    "unit": "лист",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 13,
      "slot": "r1c2"
    },
    "status": "verified",
    "thicknessMm": 8,
    "weightKg": 18,
    "image": "catalog/2026/previews/p13-r1c2.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      494,
      258,
      879,
      590
    ],
    "imageEvidence": "PDF p13 r1c2; crop from inspected page render below badge and above caption; 385x332px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p13-r2c1",
    "sku": "JSPJ-5014",
    "name": null,
    "categoryId": "metal",
    "kind": "panel",
    "priceRub": 8000,
    "unit": "лист",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 13,
      "slot": "r2c1"
    },
    "status": "verified",
    "thicknessMm": 8,
    "weightKg": 18,
    "image": "catalog/2026/previews/p13-r2c1.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      66,
      755,
      451,
      1089
    ],
    "imageEvidence": "PDF p13 r2c1; crop from inspected page render below badge and above caption; 385x334px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p15-r1c1",
    "sku": "8425-P",
    "name": null,
    "categoryId": "bamboo_stone",
    "kind": "panel",
    "priceRub": 8000,
    "unit": "лист",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 15,
      "slot": "r1c1"
    },
    "status": "verified",
    "thicknessMm": 8,
    "weightKg": 18,
    "image": "catalog/2026/previews/p15-r1c1.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      56,
      273,
      448,
      680
    ],
    "imageEvidence": "PDF p15 r1c1; crop from inspected page render below badge and above caption; 392x407px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p15-r1c2",
    "sku": "8418-P",
    "name": null,
    "categoryId": "bamboo_stone",
    "kind": "panel",
    "priceRub": 8000,
    "unit": "лист",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 15,
      "slot": "r1c2"
    },
    "status": "verified",
    "thicknessMm": 8,
    "weightKg": 18,
    "image": "catalog/2026/previews/p15-r1c2.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      495,
      273,
      887,
      680
    ],
    "imageEvidence": "PDF p15 r1c2; crop from inspected page render below badge and above caption; 392x407px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p17-r1c1",
    "sku": "007-2",
    "name": "Песочный",
    "categoryId": "soft",
    "kind": "panel",
    "priceRub": 8000,
    "unit": "шт",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 17,
      "slot": "r1c1"
    },
    "status": "verified",
    "thicknessMm": 7,
    "weightKg": 13,
    "image": "catalog/2026/previews/p17-r1c1.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      70,
      272,
      446,
      611
    ],
    "imageEvidence": "PDF p17 r1c1; crop from inspected page render below badge and above caption; 376x339px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p17-r1c2",
    "sku": "6011-2",
    "name": "Карамель",
    "categoryId": "soft",
    "kind": "panel",
    "priceRub": 8000,
    "unit": "шт",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 17,
      "slot": "r1c2"
    },
    "status": "verified",
    "thicknessMm": 7,
    "weightKg": 13,
    "image": "catalog/products/6011-2.webp",
    "imageStatus": "confirmed_reused",
    "imageEvidence": "PDF p17 r1c2: exact SKU 6011-2; visual comparison with existing texture/object. Original photo resolution not certified."
  },
  {
    "id": "pdf2026-p19-r1c1",
    "sku": "YSY26107",
    "name": null,
    "categoryId": "flexible_stone",
    "kind": "flexible_stone",
    "priceRub": 9000,
    "unit": "лист",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 19,
      "slot": "r1c1"
    },
    "status": "verified",
    "thicknessMm": 2.5,
    "image": "catalog/2026/previews/p19-r1c1.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      62,
      264,
      451,
      567
    ],
    "imageEvidence": "PDF p19 r1c1; crop from inspected page render below badge and above caption; 389x303px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p19-r1c2",
    "sku": "SY26128",
    "name": null,
    "categoryId": "flexible_stone",
    "kind": "flexible_stone",
    "priceRub": 9000,
    "unit": "лист",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 19,
      "slot": "r1c2"
    },
    "status": "verified",
    "thicknessMm": 2.5,
    "image": "catalog/2026/previews/p19-r1c2.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      493,
      264,
      881,
      567
    ],
    "imageEvidence": "PDF p19 r1c2; crop from inspected page render below badge and above caption; 388x303px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p19-r2c1",
    "sku": "SY26138",
    "name": null,
    "categoryId": "flexible_stone",
    "kind": "flexible_stone",
    "priceRub": 9000,
    "unit": "лист",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 19,
      "slot": "r2c1"
    },
    "status": "verified",
    "thicknessMm": 2.5,
    "image": "catalog/2026/previews/p19-r2c1.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      62,
      748,
      451,
      1052
    ],
    "imageEvidence": "PDF p19 r2c1; crop from inspected page render below badge and above caption; 389x304px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p19-r2c2",
    "sku": "SY26135",
    "name": null,
    "categoryId": "flexible_stone",
    "kind": "flexible_stone",
    "priceRub": 9000,
    "unit": "лист",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 19,
      "slot": "r2c2"
    },
    "status": "verified",
    "thicknessMm": 2.5,
    "image": "catalog/2026/previews/p19-r2c2.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      493,
      748,
      881,
      1052
    ],
    "imageEvidence": "PDF p19 r2c2; crop from inspected page render below badge and above caption; 388x304px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p21-r1c1",
    "sku": "3204-254",
    "name": "Венецианская, песок",
    "categoryId": "plaster",
    "kind": "panel",
    "priceRub": 6000,
    "unit": "шт",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 21,
      "slot": "r1c1"
    },
    "status": "verified",
    "thicknessMm": 5,
    "weightKg": 13,
    "image": "catalog/2026/previews/p21-r1c1.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      65,
      278,
      451,
      646
    ],
    "imageEvidence": "PDF p21 r1c1; crop below category badge and above caption; 386x368px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p21-r1c2",
    "sku": "3203-254",
    "name": "Венецианская, шампань",
    "categoryId": "plaster",
    "kind": "panel",
    "priceRub": 6000,
    "unit": "шт",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 1220
    },
    "source": {
      "pdfPage": 21,
      "slot": "r1c2"
    },
    "status": "verified",
    "thicknessMm": 5,
    "weightKg": 13,
    "image": "catalog/2026/previews/p21-r1c2.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      494,
      278,
      879,
      646
    ],
    "imageEvidence": "PDF p21 r1c2; crop below category badge and above caption; 385x368px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p23-r1c1",
    "sku": "6652-71",
    "name": "Рейка, фактура ткань",
    "categoryId": "slats",
    "kind": "slat",
    "priceRub": 1500,
    "unit": "шт",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 155
    },
    "source": {
      "pdfPage": 23,
      "slot": "r1c1"
    },
    "status": "verified",
    "image": "catalog/products/6652-71.webp",
    "imageStatus": "confirmed_reused",
    "imageEvidence": "PDF p23 r1c1: exact SKU 6652-71; visual comparison with existing texture/object. Original photo resolution not certified."
  },
  {
    "id": "pdf2026-p23-r1c2",
    "sku": "009-A229",
    "name": "Рейка, металлик",
    "categoryId": "slats",
    "kind": "slat",
    "priceRub": 1500,
    "unit": "шт",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 155
    },
    "source": {
      "pdfPage": 23,
      "slot": "r1c2"
    },
    "status": "verified",
    "image": "catalog/products/009-A229.webp",
    "imageStatus": "confirmed_reused",
    "imageEvidence": "PDF p23 r1c2: exact SKU 009-A229; visual comparison with existing texture/object. Original photo resolution not certified."
  },
  {
    "id": "pdf2026-p23-r2c1",
    "sku": null,
    "name": "Венецианская штукатурка",
    "categoryId": "slats",
    "kind": "slat",
    "priceRub": 1500,
    "unit": "шт",
    "dimensions": {
      "lengthMm": 3000,
      "widthMm": 155
    },
    "source": {
      "pdfPage": 23,
      "slot": "r2c1"
    },
    "status": "verified",
    "description": "Рейка, штукатурка золото",
    "image": "catalog/2026/previews/p23-r2c1.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      72,
      780,
      449,
      1111
    ],
    "imageEvidence": "PDF p23 r2c1; crop from inspected page render below badge and above caption; 377x331px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p25-r1c1",
    "sku": null,
    "name": "Н-профиль",
    "categoryId": "profiles",
    "kind": "profile",
    "priceRub": 600,
    "unit": "шт",
    "dimensions": {
      "lengthMm": 3000
    },
    "source": {
      "pdfPage": 25,
      "slot": "r1c1"
    },
    "status": "verified",
    "material": "алюминий",
    "variant": "бронза",
    "description": "Соединительный - бронза",
    "image": "catalog/2026/previews/p25-r1c1.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      69,
      260,
      444,
      587
    ],
    "imageEvidence": "PDF p25 r1c1; crop from inspected page render below badge and above caption; 375x327px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p25-r1c2",
    "sku": null,
    "name": "Н-профиль",
    "categoryId": "profiles",
    "kind": "profile",
    "priceRub": 600,
    "unit": "шт",
    "dimensions": {
      "lengthMm": 3000
    },
    "source": {
      "pdfPage": 25,
      "slot": "r1c2"
    },
    "status": "verified",
    "material": "алюминий",
    "variant": "золото",
    "description": "Соединительный - золото",
    "image": "catalog/2026/previews/p25-r1c2.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      490,
      260,
      867,
      587
    ],
    "imageEvidence": "PDF p25 r1c2; crop from inspected page render below badge and above caption; 377x327px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p25-r2c1",
    "sku": null,
    "name": "Н-профиль",
    "categoryId": "profiles",
    "kind": "profile",
    "priceRub": 600,
    "unit": "шт",
    "dimensions": {
      "lengthMm": 3000
    },
    "source": {
      "pdfPage": 25,
      "slot": "r2c1"
    },
    "status": "verified",
    "material": "алюминий",
    "variant": "серебро",
    "description": "Соединительный - серебро",
    "image": "catalog/2026/previews/p25-r2c1.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      69,
      778,
      444,
      1105
    ],
    "imageEvidence": "PDF p25 r2c1; crop from inspected page render below badge and above caption; 375x327px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p25-r2c2",
    "sku": null,
    "name": "Н-профиль",
    "categoryId": "profiles",
    "kind": "profile",
    "priceRub": 600,
    "unit": "шт",
    "dimensions": {
      "lengthMm": 3000
    },
    "source": {
      "pdfPage": 25,
      "slot": "r2c2"
    },
    "status": "verified",
    "material": "алюминий",
    "variant": "шампань",
    "description": "Соединительный - шампань",
    "image": "catalog/2026/previews/p25-r2c2.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      490,
      778,
      867,
      1105
    ],
    "imageEvidence": "PDF p25 r2c2; crop from inspected page render below badge and above caption; 377x327px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p26-r1c1",
    "sku": null,
    "name": "Н-профиль",
    "categoryId": "profiles",
    "kind": "profile",
    "priceRub": 600,
    "unit": "шт",
    "dimensions": {
      "lengthMm": 3000
    },
    "source": {
      "pdfPage": 26,
      "slot": "r1c1"
    },
    "status": "verified",
    "material": "алюминий",
    "variant": "чёрный",
    "description": "Соединительный - чёрный",
    "image": "catalog/2026/previews/p26-r1c1.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      72,
      266,
      451,
      591
    ],
    "imageEvidence": "PDF p26 r1c1; crop from inspected page render below badge and above caption; 379x325px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p26-r1c2",
    "sku": null,
    "name": "Угол внутренний",
    "categoryId": "profiles",
    "kind": "profile",
    "priceRub": 600,
    "unit": "шт",
    "dimensions": {
      "lengthMm": 3000
    },
    "source": {
      "pdfPage": 26,
      "slot": "r1c2"
    },
    "status": "verified",
    "material": "алюминий",
    "image": "catalog/2026/previews/p26-r1c2.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      494,
      266,
      872,
      591
    ],
    "imageEvidence": "PDF p26 r1c2; crop from inspected page render below badge and above caption; 378x325px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p26-r2c1",
    "sku": null,
    "name": "Угол наружный",
    "categoryId": "profiles",
    "kind": "profile",
    "priceRub": 600,
    "unit": "шт",
    "dimensions": {
      "lengthMm": 3000
    },
    "source": {
      "pdfPage": 26,
      "slot": "r2c1"
    },
    "status": "verified",
    "material": "алюминий",
    "image": "catalog/2026/previews/p26-r2c1.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      72,
      780,
      451,
      1101
    ],
    "imageEvidence": "PDF p26 r2c1; crop from inspected page render below badge and above caption; 379x321px; no upscaling. Temporary preview, original photo required."
  },
  {
    "id": "pdf2026-p26-r2c2",
    "sku": null,
    "name": "П-профиль",
    "categoryId": "profiles",
    "kind": "profile",
    "priceRub": 600,
    "unit": "шт",
    "dimensions": {
      "lengthMm": 3000
    },
    "source": {
      "pdfPage": 26,
      "slot": "r2c2"
    },
    "status": "verified",
    "material": "алюминий",
    "image": "catalog/2026/previews/p26-r2c2.webp",
    "imageStatus": "pdf_preview",
    "previewCrop": [
      494,
      780,
      872,
      1101
    ],
    "imageEvidence": "PDF p26 r2c2; crop from inspected page render below badge and above caption; 378x321px; no upscaling. Temporary preview, original photo required."
  }
]
