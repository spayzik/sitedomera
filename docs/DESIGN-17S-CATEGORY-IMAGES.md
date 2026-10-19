# DESIGN-17S — owner-supplied category images

Replacement BASE: c023ca993b5ba2a254c9ee955bf983934e749add.

The Owner supplied nine editorial images and requested their use in the carousel.
All originals are 1086 × 1448 PNG. The site uses WebP quality 90 at the same
dimensions, without upscaling, generated content or changes to the product photos.
Category identities, names and counts still come exclusively from collections.
The presentation mapping is in src/lib/categoryPresentation.ts.

## Mapping

Image paths below are relative to public/catalog/categories/.

| Category | Attachment # | WebP | Original PNG SHA256 |
|---|---:|---|---|
| Дерево | 1 | carousel-2026-wood.webp | 009cb580c1c5c16b383d93e3db794a3ffdce3c9d966b4391911b8b8f1b17a593 |
| Ткань | 9 | carousel-2026-fabric.webp | f07b0d437bf8d55d99f013393db8111a0fbece3980e478887f25b02a9d9c1dba |
| Металл | 2 | carousel-2026-metal.webp | de576d80d737d3778a85e3c4d38b9ede000f5a1e6723fc3f95772c2e36741690 |
| Бамбук под камень | 3 | carousel-2026-bamboo_stone.webp | a436e414e45108a2da53f48023de1beda497018eba9eebf6966ca67aaba64201 |
| Софт-тач | 4 | carousel-2026-soft.webp | 053817a62542e8a5ec4b5089777a383f0fccccf8b0c3ba1b70556863cc42974e |
| Гибкий камень | 5 | carousel-2026-flexible_stone.webp | 5743d3c2ddce16e8d2f8c6a0bfce132e1f2e6218c1e3325a17f999e5caee4df7 |
| Штукатурка | 6 | carousel-2026-plaster.webp | e8d4ae7494c4620c7c8401073338664f023f984b6737eb4c4bea6e6e5c723b56 |
| Декоративные рейки | 7 | carousel-2026-slats.webp | d612120b84c54c44548dac711b88f09195df82c03e7eaecda84d4baee25b2d3f |
| Профиль и комплектующие | 8 | carousel-2026-profiles.webp | 3a6532e31bc8365d1898f08f9892350f7647e4026442eaae7b95af633ee5bfe3 |

All nine are full-panel editorial backgrounds. The profile image is positioned
right/bottom to prioritize the foreground accessories. The prior four bounded
PDF samples and their unused carousel-only CSS were replaced by these scenes.
Previous assets remain intact; no unrelated asset cleanup is performed.

Total source PNG bytes: 24,773,203. Total WebP bytes: 2,712,068.
The carousel retains lazy loading, native scroll, links, expansion and touch snap.
At the Owner's request, the visible presentation is limited to photos and material
names. The section heading, item counts, descriptions and repeated CTA text are
removed. Wider/taller desktop panels and a lighter gradient give the scenes room;
small overlaid arrows preserve access to all nine categories.

## Evidence boundary

These Owner-selected scenes illustrate categories; they do not establish a specific
SKU, installed material, construction detail or technical compatibility.
The canonical inventory, 38 provisional product images, seven reused product images
and unresolved fabric record are unchanged. Replacing category imagery does not
resolve those separate product-image review items.

No preview/production deployment is included. Existing staging noindex/robots,
notice, analytics and credential boundaries remain unchanged.
