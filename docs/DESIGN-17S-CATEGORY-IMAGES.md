# DESIGN-17S — category presentation and image evidence

Source: editorial `65b1e54e7e35441795ed7307ae95b381f32e1823`.
Original five-panel reference: `c1a71796ecc3a426a5458f29b7d8df5a5848eb40`.
Category identities, names and counts come exclusively from `collections`.
The presentation mapping lives in `src/lib/categoryPresentation.ts`, outside the immutable product inventory.

## Mapping

Paths below are relative to `public/`. Editorial photographs illustrate a material family;
they do **not** prove a specific SKU, actual installation, construction or performance property.

| Category | Image | Native pixels | Evidence / mode | Quality / outstanding input |
|---|---|---:|---|---|
| Дерево | catalog/categories/carusel-bamboo.webp | 1086 × 1448 | Original carousel; visible vertical wood grain in an interior | Suitable editorial presentation; not a product photograph |
| Ткань | catalog/categories/carusel-cotton.webp | 1086 × 1448 | Original carousel; visible woven surface | Suitable editorial presentation; not a product photograph |
| Металл | catalog/2026/previews/p13-r1c1.webp | 385 × 332 | First published metal product; existing PDF mapping | Bounded real sample, at most 220 × 220 CSS px; original category asset required |
| Бамбук под камень | catalog/2026/previews/p15-r1c1.webp | 392 × 407 | First published bamboo-stone product; existing PDF mapping | Bounded sample; original category asset required |
| Софт-тач | catalog/categories/carusel-softtouch.webp | 1086 × 1448 | Original carousel; smooth matte panel scene | Editorial inspiration only; photo does not prove tactile properties |
| Гибкий камень | catalog/categories/carusel-stone.webp | 1086 × 1448 | Original carousel's stone illustration; visibly rough stone scene | Editorial inspiration only; does not establish the new SKU or that the installed material is flexible stone; owner confirmation desirable |
| Штукатурка | catalog/2026/previews/p21-r1c1.webp | 386 × 368 | First published plaster product; existing PDF mapping | Bounded sample; original category asset required |
| Декоративные рейки | catalog/categories/carusel-reech.webp | 1086 × 1448 | Original carousel; visible vertical slats | Suitable editorial presentation; not evidence of a particular slat SKU |
| Профиль и комплектующие | catalog/2026/previews/p25-r1c1.webp | 375 × 327 | First published profile; existing PDF mapping | Entire form shown with contain; bounded sample; original category asset required |

The four sample paths are derived from the corresponding canonical product, not
duplicated in the component. Verify the exact filenames against that mapping.
Samples are never stretched to fill the tall panel. A neutral dark frame provides
the remaining composition; CSS does not synthesize material textures.
At high device pixel ratios these small previews still have limited detail.
No upscaling, re-encoding, generated image or change to product-image identity is performed.

## Interaction / performance contract

- One native horizontal scroll track; all nine links remain in source order.
- Desktop: only the active panel changes flex basis, rather than flex-grow on all nine.
- Narrow screens up to 820 px and coarse/no-hover touch devices at any width:
  fixed panel basis, native scroll snap, persistent descriptions.
- Explicit previous/next controls; no autoplay, wheel interception or carousel dependency.
- Reduced motion removes panel/image transitions. Hero/Manifest reveal remains unchanged.
- Category links retain the existing hash-router contract and query-safe product navigation.

## Release boundary

The 38 PDF previews, seven reused images and unresolved source record retain their
existing provenance and owner-review status. Removing internal QA labels from the
customer UI does not approve image quality or remove production blockers.
This branch is for Chief review. Preview publication requires separate permission;
the preview repository, pinned source, noindex/robots protections, notice and absence
of live analytics/Avito credentials are unchanged by this task.
