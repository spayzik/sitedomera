# OWNER INPUT REQUIRED — Catalog 2026

Review date: 2026-10-14. Original 27-page owner PDF reviewed independently; see CATALOG-2026-SOURCE-COMPARISON.md for every position.

## Release blockers

1. p11 r2c2 (fabric): provide official name or SKU. Price/specs alone do not identify the product. Until resolved, exclude from public products; preserve its source record.
2. Provide original product photos/textures for the 38 identifiable positions without a verified old asset match, plus the unresolved p11 r2c2 card if it is later identified. Owner ZIP contains only a raster PDF, JSON and readme. PDF crops can be temporary explicitly marked previews, not claimed original/high-resolution photographs.
3. Review image fidelity and source dimensions before production. The seven reused asset candidates are also not proven original photographs.

## Ambiguous SKU

- p6 r1c3, Орех дымчатый: `7189A237AI` versus `7189A237A1`. Confirm from manufacturer label/invoice; do not infer from old website.

## Missing official SKU

A named item can be displayed without SKU. Do not invent ELKA-S / ELKA-T / SLAT-PL or publish a technical internal ID as an article number.

- p6 r1c1: Ясень серый
- p6 r2c1: Серая ёлка
- p6 r2c2: Дуб пепельный
- p6 r2c3: Дуб светлый
- p11 r2c2: unnamed fabric card
- p23 r2c1: Венецианская штукатурка
- p25 r1c1: Н-профиль; Соединительный - бронза
- p25 r1c2: Н-профиль; Соединительный - золото
- p25 r2c1: Н-профиль; Соединительный - серебро
- p25 r2c2: Н-профиль; Соединительный - шампань
- p26 r1c1: Н-профиль; Соединительный - чёрный
- p26 r1c2: Угол внутренний
- p26 r2c1: Угол наружный
- p26 r2c2: П-профиль

## Missing separate product names

For these 21 identifiable positions, the source gives a SKU only. Displaying that SKU is truthful; request official names if desired. Do not create texture/color names from appearance.

- p7 r1c1: A9009
- p7 r1c2: 8840-M
- p7 r1c3: A9014
- p7 r2c1: 8326-S
- p7 r2c2: 8313-S
- p10 r1c1: 8139-P
- p10 r1c2: 8141-P
- p10 r2c1: A9001
- p10 r2c2: A9003
- p11 r1c1: 8111-P
- p11 r1c2: 8021-P
- p11 r2c1: A9005
- p13 r1c1: JSPJ-5012
- p13 r1c2: JSPJ-6043
- p13 r2c1: JSPJ-5014
- p15 r1c1: 8425-P
- p15 r1c2: 8418-P
- p19 r1c1: YSY26107
- p19 r1c2: SY26128
- p19 r2c1: SY26138
- p19 r2c2: SY26135

## Technical information to verify

- Flexible stone p19: weight, composition, mounting and compatibility; PDF gives dimensions and 2.5 mm only.
- Slats p23: thickness, weight, construction/material; do not inherit 5 mm / 13 kg / WPC from panel defaults.
- Aluminium profiles p25–26: cross-section widths, compatible panel thickness, colors for corner/finishing pieces if required. Do not infer fit from the photos.
- Confirm surprising but clearly printed soft-touch 7 mm / 13 kg; keep source values pending correction from owner.
- Confirm surface film: p3 says ПВХ / ПП, while the construction diagram on p4 says ПВХ / ПЭТ. The site does not pick one as a universal coating.
- Confirm composition/ABA/PUR/layer claims by actual product group and supporting technical documents. No universal transfer to stone/profiles.
- Current physical stock is unknown. PDF listing is not evidence for «в наличии».
- Confirm current prices, sale units and whether catalogue prices can be publicly offered. Printed units alternate шт/лист; retain per item.
- Confirm whether old items omitted from PDF remain for sale. The implementation retires 19 old IDs; any reinstatement needs source/price/photo evidence.
- Confirm whether seven exact-SKU cart identities may carry over unchanged. No fuzzy name/image substitution.
- Delivery, warranty, certification and business/legal information cannot be derived from product pictures. Existing owner legal checklists remain applicable.

## Implemented application behavior — architecture approved with conditions

- 46-source-position inventory; 45 identifiable items in the feature-branch catalogue; 1 owner-review-only record.
- Typed groups panel / flexible_stone / slat / profile, explicit prices and dimensions; nullable official SKU; optional only-confirmed technical facts.
- Sheet calculator: user selects an actual sheet material; no profile/slat area calculations; no selected item means no draft/result.
- Quiz: suggest a material category from aesthetic preference, then let user select a concrete catalogue item; no unsupported precise SKU recommendation.
- Cart: canonical latest price, only exact verified identity migration; removed entries never become another product.
- Telegram: direct user-initiated drafts with product data only; no automatic sending or backend.

## Chief / release acceptance

- Independently review the 46-row source matrix and actual image mapping.
- Approve temporary PDF previews or replace them with confirmed original photos.
- Resolve p11 r2c2 identity and p6 r1c3 SKU; optionally supply missing names/SKUs.
- Confirm current commercial prices/units and product technical documentation.
- Review final production-dist browser evidence at 1440, 1024, 768, 390 and 360 px.
- Existing Installation service/guarantee statements were retained from the accepted site; this PDF does not independently substantiate those business claims. Owner confirmation remains necessary.
- Existing same-day dispatch wording in Conditions and the contact configuration also needs owner confirmation; product catalogue pages do not establish delivery commitments.
- No automatic merge, GitHub Pages upload or REG.RU deployment is authorized by this branch.
