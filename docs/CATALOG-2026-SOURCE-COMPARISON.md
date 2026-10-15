# Catalog 2026 — source-to-site comparison

Status: independently reviewed source inventory integrated in feature branch. Owner approved the implementation architecture with conditions on 2026-10-14. Production merge/deploy remain blocked pending Chief review and owner image/data confirmation.

## CATALOG-16C — Chief corrections, 2026-10-14–15

Correction base: `346fec0a1d9a160c0c45f5092be5a996b10849d3`. Product model, all 46 PDF source records, confirmed commercial/technical facts and image sources are unchanged.

- Category tiles are real links to `#/catalog?category=...`, usable by keyboard and in a new tab. Catalog filter and ProductModal derive from current query; product open/close preserve category and unrelated parameters. History changes are observed on both hashchange and popstate; Back/Forward restore the corresponding modal/filter state.
- Quiz restores three questions: room, style and whole-project budget. Room and budget are used in result context and manager discussion guidance. Only style selects categories; budget is not a per-panel price filter, and no answer establishes technical suitability. User chooses a product; restart clears answers/category/product. Telegram contains the selected product only.
- Cart reports excluded IDs only from the documented 19 retired identities. Mixed migration keeps verified items at canonical prices; fully retired selections become an empty cart with the same notice. A `pending` flag under `domera-cart-update-notice-v1` retains the notice until acknowledgement, then is removed. Basket storage remains ID/qty only. Nothing can retrospectively identify entries already deleted by an earlier candidate.
- New regressions are part of existing `test:catalog`, already in CI before Pages upload; no workflow architecture or deployment changes.

### Category image risk matrix

Actual image boxes in CSS pixels (borders excluded): desktop 1440×900: about 477×340; tablet 768×1024: 548×696; mobile 390×844: 275×574; mobile 360×800: 254×544. The final tile may be one pixel wider due to rounding. `object-fit: cover` crops and enlarges the source; hover adds up to 5.5%. The table shows the largest cover scale across these viewports, before hover and device pixel ratio. DPR 2 doubles the required raster resolution.

| Category | Current source | Native pixels | Largest CSS cover scale | Risk / safe future treatment |
|---|---|---:|---:|---|
| Дерево | PDF p6/r1c1 | 254×294 | 2.37× | High: visibly soft; original category photo or smaller bounded source sample |
| Ткань | verified old 671-A227 asset | 1000×1000 | 0.70× | Lower at DPR 1; original quality and DPR 2 still require visual acceptance |
| Металл | PDF p13/r1c1 | 385×332 | 2.10× | High: insufficient detail for a large texture tile |
| Бамбук под камень | PDF p15/r1c1 | 392×407 | 1.71× | High: enlargement and texture-detail loss |
| Софт-тач | PDF p17/r1c1 | 376×339 | 2.05× | High: low-resolution flat-color preview is not an original sample photograph |
| Гибкий камень | PDF p19/r1c1 | 389×303 | 2.30× | High: source detail cannot support the tall cover crop |
| Штукатурка | PDF p21/r1c1 | 386×368 | 1.89× | High: enlarged small texture sample |
| Декоративные рейки | verified old 6652-71 asset | 1000×1000 | 0.70× | Lower at DPR 1; identity confirmed, original photo quality not established |
| Профиль и комплектующие | PDF p25/r1c1 | 375×327 | 2.13× | High: cover both enlarges and crops the profile geometry |

DESIGN-17A: use owner-confirmed original category assets with sufficient resolution and intentional composition. DESIGN-17B if originals are unavailable: neutral branded panels with bounded, correctly proportioned real sample images or an explicitly labelled composition of confirmed samples; show profiles with contain rather than a cropped texture background. Do not generate/substitute textures, upscale previews as if detail were recovered, or assign an unrelated image. This correction does not replace banners or redesign tiles.

### Correction verification

The original candidate results below are historical. CATALOG-16C regressions expand `test:catalog` to 13 tests (28 total across existing commands). Browser checks use production dist on an isolated local origin. Legacy baskets are seeded by an external local QA page through explicit clicks, never by publishing fixtures or injecting runtime state into the application.

- All nine category links were followed and their active filter/count checked at 1440 and 360 px: 11 / 10 / 3 / 2 / 2 / 4 / 2 / 3 / 8. Keyboard Enter and Ctrl-click opening a new category tab were checked.
- Combined `category=fabric&sku=671-A227&campaign=a%26b` opens the correct product; closing removes only sku, Back restores it and Forward returns to the filtered catalogue. Product Telegram draft contains the current 7,000 RUB/лист price.
- Category image geometry and quiz result geometry were measured at all four requested viewports, with no document horizontal overflow. Quiz was completed with bedroom/cozy/basic, then restarted and completed with office/metal/premium. Restart clears the product and draft; the new selected item gives its own correct draft without room/style/budget answers.
- At 390 px, mixed legacy cart migration preserves two ash panels at 14,000 RUB and shows the notice. Reload before acknowledgement retains it; acknowledgement followed by reload removes it. A retired-only cart shows notice + empty state + zero total and no Telegram draft; acknowledgement also survives reload.
- Saved local screenshots: correction-categories-360.jpg, correction-cart-notice-390.jpg and correction-empty-cart-390.jpg. Desktop screenshot capture has the previously documented physical-width limitation. These are browser viewport tests, not physical iPhone/touch-device acceptance.
- A further combined 768/390 category batch was interrupted by a browser-tool timeout; its partial execution is not counted as a completed nine-link test. Browser tooling then changed with the session refresh, so that additional batch was not repeated. The completed results above and all four viewport measurements remain the evidence used here.
- Build, production verifier, lint, npm audit, all 28 tests and diff check passed locally. Lint retains the existing Fast Refresh warning. One verifier run was mistakenly started while the build was replacing dist; the final sequential run after build completion passed. No assertion or release gate was weakened.

## Original candidate verification evidence — 2026-10-14

Environment: Windows, Node 24.18.0, npm 11.16.0. CI retains Node 22. Checks below are local; hosted CI and independent Chief acceptance have not been run for this feature branch.

- `npm ci`, build, production verifier, lint, audit and `git diff --check`: passed. Lint retains the pre-existing Fast Refresh warning in CartContext. Audit: zero vulnerabilities after the isolated source-map-js security patch described below.
- Avito 3, Telegram 6, SEO 3, calculator 3 and catalogue 10 tests: 25 passed, zero failed. Catalogue tests cover all 46 source records, 45 public records, individual prices/units/specs, optional facts, images, exact cart identity migration and live canonical price propagation.
- Production verifier: 274 dist files, 45 mapped product images, eight fonts; production-root and Pages-subpath resolution checked. HTTP HEAD of all 274 files through local Vite preview: 200, no failures. Source PDFs, owner JSON, scripts, docs, credentials and source maps are not deployed.
- Browser testing used production `dist` via Vite preview, not the development server. Full 45-card grid scrolled at 1440×900, 1024×768, 768×1024, 390×844 and 360×800; no document horizontal overflow or broken product images observed. The two soft-touch cards at 768 px were additionally inspected directly.
- All nine filters: 11 / 10 / 3 / 2 / 2 / 4 / 2 / 3 / 8 public items. Search by name, SKU and empty-result case checked; quick-add, ProductModal, missing SKU, stone missing weight and profile optional characteristics checked.
- Calculator: no material means no actionable result/draft; 30 m² gives nine sheets, 63,000 RUB for Ясень песочный and 81,000 RUB for YSY26107. Negative input disables add/draft; changing material updates price. Mobile 360/390 px checked; Counter reaches the final seven sheets for 25 m² after animation.
- Quiz: different styles produce valid categories; add and Telegram stay unavailable until a concrete material is selected. Desktop and 360 px flows checked; room/style answers are absent from decoded Telegram drafts.
- Additional tablet checks: selected-material calculator at 1024×768 and 768×1024 fits its container; quiz at 768×1024 correctly selects Карамель and creates an 8,000 RUB/unit draft without document overflow.
- Cart: two ash panels = 14,000 RUB; plus bronze profile = 14,600 RUB; plus nine stone sheets = 95,600 RUB. Quantity, current unit prices, total, optional SKU and reload persistence checked. Old-ID migration was tested deterministically in Node, not by injecting browser storage.
- Updated Hero/Specs/category blocks checked on mobile; nine-category carousel scrolls without body overflow. New 13–18 range initially wrapped in Specs at 360 px; a scoped typography rule fixes it, with final value measured on one line. Installation source/layout was retained unchanged.
- Console captured no warnings/errors in the final checked browser state. Observed external asset inventory contains the existing Yandex Maps iframe; no browser Avito API or Telegram Bot API transport was introduced. Telegram checks inspect trusted destination and decoded draft, without sending a message.
- Browser screenshot backend clips the right edge of the 1440 px virtual viewport to its physical capture width; desktop geometry was checked through DOM in addition to visible screenshots. Mobile evidence is complete-width. This is a local responsive check, not physical-device or independent Chief visual acceptance.

Screenshots and original-source renders are retained outside Git in the local CATALOG-16 evidence folder. Production remains blocked by the owner/Chief questions listed in OWNER-CATALOG-2026-QUESTIONS.md, especially original image quality and ambiguous/unidentified source cards.

Baseline: `c1a71796ecc3a426a5458f29b7d8df5a5848eb40`. Review: 2026-10-14.

Original owner PDF: 27 pages, SHA-256 `d517116b7b856e8f1637a0f5415a8f7ef82ea4c12e213a5ae8ad0efe430bc626`.
The PDF and owner JSON are retained outside Git. All 46 cards on pages 6, 7, 9, 10, 11, 13, 15, 17, 19, 21, 23, 25, 26 were visually checked against full page renders.

## Source priority

Individual card > category description > generic marketing. Page 3 has an obsolete contents list and uniform 5 mm / 13 kg claims; page 27 repeats uniform-characteristics wording. These cannot override cards.

## Inventory

| Category | PDF pages | Source items | Identifiable | Unresolved identity |
|---|---|---:|---:|---:|
| Дерево | 6, 7 | 11 | 11 | 0 |
| Ткань | 9, 10, 11 | 11 | 10 | 1 |
| Металл | 13 | 3 | 3 | 0 |
| Бамбук под камень | 15 | 2 | 2 | 0 |
| Софт-тач | 17 | 2 | 2 | 0 |
| Гибкий камень | 19 | 4 | 4 | 0 |
| Штукатурка | 21 | 2 | 2 | 0 |
| Декоративные рейки | 23 | 3 | 3 | 0 |
| Профиль и комплектующие | 25, 26 | 8 | 8 | 0 |

Total: 46 source positions, 9 categories; 45 identifiable positions, 1 unresolved identity. This is not a production readiness assertion. Fourteen SKUs are absent; one further SKU is ambiguous. Twenty-two separate names are absent (21 have a SKU; one has neither).

## All positions

An empty source field is shown as «не указан», never inferred from the old site. No product is proven in stock by this PDF. Internal IDs are assigned once from this source revision, independent of official SKU. Do not regenerate or reuse them for a different product if a future PDF changes pagination; preserve an ID only for the same proven identity.

| Internal ID / PDF slot | Category | PDF SKU | PDF name / subtitle | Price / unit | Dimensions mm | Thickness / weight | Old site match and old price | Proposed handling |
|---|---|---|---|---|---|---|---|---|
| pdf2026-p06-r1c1 | Дерево | не указан | Ясень серый | 7000 ₽ / шт | 1220 × 3000 | 5 мм; 13 кг | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки |
| pdf2026-p06-r1c2 | Дерево | C807601-36 | Ясень песочный | 7000 ₽ / шт | 1220 × 3000 | 5 мм; 13 кг | C807601-36; 6000 ₽; 5 мм / 13 кг | В витрине: подтверждённые поля; качество фото требует приёмки |
| pdf2026-p06-r1c3 | Дерево | AMBIGUOUS: 7189A237AI ? 7189A237A1 | Орех дымчатый | 7000 ₽ / шт | 1220 × 3000 | 5 мм; 13 кг | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки |
| pdf2026-p06-r2c1 | Дерево | не указан | Серая ёлка | 7000 ₽ / шт | 1220 × 3000 | 5 мм; 13 кг | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки |
| pdf2026-p06-r2c2 | Дерево | не указан | Дуб пепельный | 7000 ₽ / шт | 1220 × 3000 | 5 мм; 13 кг | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки |
| pdf2026-p06-r2c3 | Дерево | не указан | Дуб светлый | 7000 ₽ / шт | 1220 × 3000 | 5 мм; 13 кг | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки |
| pdf2026-p07-r1c1 | Дерево | A9009 | не указано | 7000 ₽ / шт | 1220 × 3000 | 7 мм; 18 кг | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки; отображать SKU, не придумывать имя |
| pdf2026-p07-r1c2 | Дерево | 8840-M | не указано | 7000 ₽ / шт | 1220 × 3000 | 7 мм; 18 кг | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки; отображать SKU, не придумывать имя |
| pdf2026-p07-r1c3 | Дерево | A9014 | не указано | 7000 ₽ / шт | 1220 × 3000 | 7 мм; 18 кг | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки; отображать SKU, не придумывать имя |
| pdf2026-p07-r2c1 | Дерево | 8326-S | не указано | 7000 ₽ / шт | 1220 × 3000 | 7 мм; 18 кг | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки; отображать SKU, не придумывать имя |
| pdf2026-p07-r2c2 | Дерево | 8313-S | не указано | 7000 ₽ / шт | 1220 × 3000 | 7 мм; 18 кг | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки; отображать SKU, не придумывать имя |
| pdf2026-p09-r1c1 | Ткань | 671-A227 | Рогожка белая | 7000 ₽ / лист | 1220 × 3000 | 5 мм; 13 кг | 671-A227; 6000 ₽; 5 мм / 13 кг | В витрине: подтверждённые поля; качество фото требует приёмки |
| pdf2026-p09-r1c2 | Ткань | 8225-6-B1 | Лён кремовый | 7000 ₽ / лист | 1220 × 3000 | 5 мм; 13 кг | 8225-6-B1; 6000 ₽; 5 мм / 13 кг | В витрине: подтверждённые поля; качество фото требует приёмки |
| pdf2026-p09-r2c1 | Ткань | 8305-W | Лён светло-серый | 7000 ₽ / лист | 1220 × 3000 | 5 мм; 13 кг | 8305-W; 6000 ₽; 5 мм / 13 кг | В витрине: подтверждённые поля; качество фото требует приёмки |
| pdf2026-p10-r1c1 | Ткань | 8139-P | не указано | 8000 ₽ / лист | 1220 × 3000 | 7 мм; 18 кг | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки; отображать SKU, не придумывать имя |
| pdf2026-p10-r1c2 | Ткань | 8141-P | не указано | 8000 ₽ / лист | 1220 × 3000 | 7 мм; 18 кг | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки; отображать SKU, не придумывать имя |
| pdf2026-p10-r2c1 | Ткань | A9001 | не указано | 8000 ₽ / лист | 1220 × 3000 | 7 мм; 18 кг | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки; отображать SKU, не придумывать имя |
| pdf2026-p10-r2c2 | Ткань | A9003 | не указано | 8000 ₽ / лист | 1220 × 3000 | 7 мм; 18 кг | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки; отображать SKU, не придумывать имя |
| pdf2026-p11-r1c1 | Ткань | 8111-P | не указано | 8000 ₽ / лист | 1220 × 3000 | 7 мм; 18 кг | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки; отображать SKU, не придумывать имя |
| pdf2026-p11-r1c2 | Ткань | 8021-P | не указано | 8000 ₽ / лист | 1220 × 3000 | 7 мм; 18 кг | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки; отображать SKU, не придумывать имя |
| pdf2026-p11-r2c1 | Ткань | A9005 | не указано | 8000 ₽ / лист | 1220 × 3000 | 7 мм; 18 кг | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки; отображать SKU, не придумывать имя |
| pdf2026-p11-r2c2 | Ткань | не указан | не указано | 8000 ₽ / лист | 1220 × 3000 | 7 мм; 18 кг | нет доказанного соответствия | Не публиковать: OWNER INPUT REQUIRED |
| pdf2026-p13-r1c1 | Металл | JSPJ-5012 | не указано | 8000 ₽ / лист | 1220 × 3000 | 8 мм; 18 кг | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки; отображать SKU, не придумывать имя |
| pdf2026-p13-r1c2 | Металл | JSPJ-6043 | не указано | 8000 ₽ / лист | 1220 × 3000 | 8 мм; 18 кг | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки; отображать SKU, не придумывать имя |
| pdf2026-p13-r2c1 | Металл | JSPJ-5014 | не указано | 8000 ₽ / лист | 1220 × 3000 | 8 мм; 18 кг | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки; отображать SKU, не придумывать имя |
| pdf2026-p15-r1c1 | Бамбук под камень | 8425-P | не указано | 8000 ₽ / лист | 1220 × 3000 | 8 мм; 18 кг | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки; отображать SKU, не придумывать имя |
| pdf2026-p15-r1c2 | Бамбук под камень | 8418-P | не указано | 8000 ₽ / лист | 1220 × 3000 | 8 мм; 18 кг | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки; отображать SKU, не придумывать имя |
| pdf2026-p17-r1c1 | Софт-тач | 007-2 | Песочный | 8000 ₽ / шт | 1220 × 3000 | 7 мм; 13 кг | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки |
| pdf2026-p17-r1c2 | Софт-тач | 6011-2 | Карамель | 8000 ₽ / шт | 1220 × 3000 | 7 мм; 13 кг | 6011-2; 6000 ₽; 5 мм / 13 кг | В витрине: подтверждённые поля; качество фото требует приёмки |
| pdf2026-p19-r1c1 | Гибкий камень | YSY26107 | не указано | 9000 ₽ / лист | 1220 × 3000 | 2.5 мм; не указан | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки; отображать SKU, не придумывать имя |
| pdf2026-p19-r1c2 | Гибкий камень | SY26128 | не указано | 9000 ₽ / лист | 1220 × 3000 | 2.5 мм; не указан | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки; отображать SKU, не придумывать имя |
| pdf2026-p19-r2c1 | Гибкий камень | SY26138 | не указано | 9000 ₽ / лист | 1220 × 3000 | 2.5 мм; не указан | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки; отображать SKU, не придумывать имя |
| pdf2026-p19-r2c2 | Гибкий камень | SY26135 | не указано | 9000 ₽ / лист | 1220 × 3000 | 2.5 мм; не указан | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки; отображать SKU, не придумывать имя |
| pdf2026-p21-r1c1 | Штукатурка | 3204-254 | Венецианская, песок | 6000 ₽ / шт | 1220 × 3000 | 5 мм; 13 кг | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки |
| pdf2026-p21-r1c2 | Штукатурка | 3203-254 | Венецианская, шампань | 6000 ₽ / шт | 1220 × 3000 | 5 мм; 13 кг | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки |
| pdf2026-p23-r1c1 | Декоративные рейки | 6652-71 | Рейка, фактура ткань | 1500 ₽ / шт | 155 × 3000 | не указана; не указан | 6652-71; 1500 ₽; 5 мм / 13 кг | В витрине: подтверждённые поля; качество фото требует приёмки |
| pdf2026-p23-r1c2 | Декоративные рейки | 009-A229 | Рейка, металлик | 1500 ₽ / шт | 155 × 3000 | не указана; не указан | 009-A229; 1500 ₽; 5 мм / 13 кг | В витрине: подтверждённые поля; качество фото требует приёмки |
| pdf2026-p23-r2c1 | Декоративные рейки | не указан | Венецианская штукатурка | 1500 ₽ / шт | 155 × 3000 | не указана; не указан | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки |
| pdf2026-p25-r1c1 | Профиль и комплектующие | не указан | Н-профиль; Соединительный - бронза | 600 ₽ / шт | длина 3000 | не указана; не указан | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки |
| pdf2026-p25-r1c2 | Профиль и комплектующие | не указан | Н-профиль; Соединительный - золото | 600 ₽ / шт | длина 3000 | не указана; не указан | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки |
| pdf2026-p25-r2c1 | Профиль и комплектующие | не указан | Н-профиль; Соединительный - серебро | 600 ₽ / шт | длина 3000 | не указана; не указан | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки |
| pdf2026-p25-r2c2 | Профиль и комплектующие | не указан | Н-профиль; Соединительный - шампань | 600 ₽ / шт | длина 3000 | не указана; не указан | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки |
| pdf2026-p26-r1c1 | Профиль и комплектующие | не указан | Н-профиль; Соединительный - чёрный | 600 ₽ / шт | длина 3000 | не указана; не указан | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки |
| pdf2026-p26-r1c2 | Профиль и комплектующие | не указан | Угол внутренний | 600 ₽ / шт | длина 3000 | не указана; не указан | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки |
| pdf2026-p26-r2c1 | Профиль и комплектующие | не указан | Угол наружный | 600 ₽ / шт | длина 3000 | не указана; не указан | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки |
| pdf2026-p26-r2c2 | Профиль и комплектующие | не указан | П-профиль | 600 ₽ / шт | длина 3000 | не указана; не указан | нет доказанного соответствия | В витрине: подтверждённые поля; качество фото требует приёмки |

## Old products absent from an exact-SKU match

These 19 old items must leave the active storefront unless the owner supplies independent identity evidence. Physical assets are retained. Similar names/patterns are not enough to migrate a cart entry.

| Old ID | Old name | Old SKU | Proposed cart behavior |
|---|---|---|---|
| 919-4 | Дуб натуральный | 919-4 | Drop outdated entry; never substitute another product |
| 8548 | Дуб выбеленный | 8548 | Drop outdated entry; never substitute another product |
| 2312-309 | Дуб дымчатый | 2312-309 | Drop outdated entry; never substitute another product |
| 8891-5 | Орех диагональ | 8891-5 | Drop outdated entry; never substitute another product |
| 8163-11Y73 | Орех американский | 8163-11Y73 | Drop outdated entry; never substitute another product |
| 8892-2 | Дуб тёмный | 8892-2 | Drop outdated entry; never substitute another product |
| 921-1 | Дуб мокко | 921-1 | Drop outdated entry; never substitute another product |
| elka-seraya | Ёлка серая | ELKA-S | Drop outdated entry; never substitute another product |
| elka-temnaya | Ёлка тёмная | ELKA-T | Drop outdated entry; never substitute another product |
| 962-1 | Букле серое | 962-1 | Drop outdated entry; never substitute another product |
| 002-A229 | Бронзовый | 002-A229 | Drop outdated entry; never substitute another product |
| 013-A229 | Графит | 013-A229 | Drop outdated entry; never substitute another product |
| 006-2 | Сталь шлифованная | 006-2 | Drop outdated entry; never substitute another product |
| 001-A261 | Серебристый рубчик | 001-A261 | Drop outdated entry; never substitute another product |
| JGFG-022 | Песочный soft-touch | JGFG-022 | Drop outdated entry; never substitute another product |
| 002-A235 | Венецианская, золото | 002-A235 | Drop outdated entry; never substitute another product |
| M3201-254 | Венецианская, жемчуг | M3201-254 | Drop outdated entry; never substitute another product |
| ryab-3d | Рябь 3D, перламутр | RYAB-3D | Drop outdated entry; never substitute another product |
| slat-plaster | Рейка, штукатурка золото | SLAT-PL | Drop outdated entry; never substitute another product |

## Image mapping

7 existing assets reused after exact-SKU and visual comparison; 38 new native-size PDF previews; 1 unresolved identity has no public asset. No original high-resolution source photographs were provided in the ZIP. Existing 1000 × 1000 images are not proven original-resolution photography.

PDF previews omit the category badge, price and caption. Extraction uses the inspected page render at a resolution lower than the original embedded raster, without enlargement. They are temporary, visibly marked in ProductModal and Quiz; owner approval/originals are required before release.

| PDF position | Public ID / identity | Actual asset | Evidence | Status |
|---|---|---|---|---|
| p6 r1c1 | pdf2026-p06-r1c1 / Ясень серый | catalog/2026/previews/p06-r1c1.webp | PDF p6 r1c1; crop from inspected page render below badge and above caption; 254x294px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p6 r1c2 | pdf2026-p06-r1c2 / Ясень песочный | catalog/products/C807601-36.webp | PDF p6 r1c2: exact SKU C807601-36; visual comparison with existing texture/object. Original photo resolution not certified. | confirmed_reused |
| p6 r1c3 | pdf2026-p06-r1c3 / Орех дымчатый | catalog/2026/previews/p06-r1c3.webp | PDF p6 r1c3; crop from inspected page render below badge and above caption; 254x294px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p6 r2c1 | pdf2026-p06-r2c1 / Серая ёлка | catalog/2026/previews/p06-r2c1.webp | PDF p6 r2c1; crop from inspected page render below badge and above caption; 254x287px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p6 r2c2 | pdf2026-p06-r2c2 / Дуб пепельный | catalog/2026/previews/p06-r2c2.webp | PDF p6 r2c2; crop from inspected page render below badge and above caption; 249x287px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p6 r2c3 | pdf2026-p06-r2c3 / Дуб светлый | catalog/2026/previews/p06-r2c3.webp | PDF p6 r2c3; crop from inspected page render below badge and above caption; 254x287px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p7 r1c1 | pdf2026-p07-r1c1 / A9009 | catalog/2026/previews/p07-r1c1.webp | PDF p7 r1c1; crop from inspected page render below badge and above caption; 254x293px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p7 r1c2 | pdf2026-p07-r1c2 / 8840-M | catalog/2026/previews/p07-r1c2.webp | PDF p7 r1c2; crop from inspected page render below badge and above caption; 249x293px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p7 r1c3 | pdf2026-p07-r1c3 / A9014 | catalog/2026/previews/p07-r1c3.webp | PDF p7 r1c3; crop from inspected page render below badge and above caption; 254x293px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p7 r2c1 | pdf2026-p07-r2c1 / 8326-S | catalog/2026/previews/p07-r2c1.webp | PDF p7 r2c1; crop from inspected page render below badge and above caption; 254x290px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p7 r2c2 | pdf2026-p07-r2c2 / 8313-S | catalog/2026/previews/p07-r2c2.webp | PDF p7 r2c2; crop from inspected page render below badge and above caption; 249x290px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p9 r1c1 | pdf2026-p09-r1c1 / Рогожка белая | catalog/products/671-A227.webp | PDF p9 r1c1: exact SKU 671-A227; visual comparison with existing texture/object. Original photo resolution not certified. | confirmed_reused |
| p9 r1c2 | pdf2026-p09-r1c2 / Лён кремовый | catalog/products/8225-6-B1.webp | PDF p9 r1c2: exact SKU 8225-6-B1; visual comparison with existing texture/object. Original photo resolution not certified. | confirmed_reused |
| p9 r2c1 | pdf2026-p09-r2c1 / Лён светло-серый | catalog/products/8305-W.webp | PDF p9 r2c1: exact SKU 8305-W; visual comparison with existing texture/object. Original photo resolution not certified. | confirmed_reused |
| p10 r1c1 | pdf2026-p10-r1c1 / 8139-P | catalog/2026/previews/p10-r1c1.webp | PDF p10 r1c1; crop from inspected page render below badge and above caption; 387x339px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p10 r1c2 | pdf2026-p10-r1c2 / 8141-P | catalog/2026/previews/p10-r1c2.webp | PDF p10 r1c2; crop from inspected page render below badge and above caption; 385x339px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p10 r2c1 | pdf2026-p10-r2c1 / A9001 | catalog/2026/previews/p10-r2c1.webp | PDF p10 r2c1; crop from inspected page render below badge and above caption; 387x331px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p10 r2c2 | pdf2026-p10-r2c2 / A9003 | catalog/2026/previews/p10-r2c2.webp | PDF p10 r2c2; crop from inspected page render below badge and above caption; 385x331px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p11 r1c1 | pdf2026-p11-r1c1 / 8111-P | catalog/2026/previews/p11-r1c1.webp | PDF p11 r1c1; crop from inspected page render below badge and above caption; 386x324px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p11 r1c2 | pdf2026-p11-r1c2 / 8021-P | catalog/2026/previews/p11-r1c2.webp | PDF p11 r1c2; crop from inspected page render below badge and above caption; 386x324px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p11 r2c1 | pdf2026-p11-r2c1 / A9005 | catalog/2026/previews/p11-r2c1.webp | PDF p11 r2c1; crop from inspected page render below badge and above caption; 386x323px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p11 r2c2 | pdf2026-p11-r2c2 / unresolved | none | PDF p11 r2c2: identity unresolved; no public image or orderable product. | unavailable |
| p13 r1c1 | pdf2026-p13-r1c1 / JSPJ-5012 | catalog/2026/previews/p13-r1c1.webp | PDF p13 r1c1; crop from inspected page render below badge and above caption; 385x332px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p13 r1c2 | pdf2026-p13-r1c2 / JSPJ-6043 | catalog/2026/previews/p13-r1c2.webp | PDF p13 r1c2; crop from inspected page render below badge and above caption; 385x332px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p13 r2c1 | pdf2026-p13-r2c1 / JSPJ-5014 | catalog/2026/previews/p13-r2c1.webp | PDF p13 r2c1; crop from inspected page render below badge and above caption; 385x334px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p15 r1c1 | pdf2026-p15-r1c1 / 8425-P | catalog/2026/previews/p15-r1c1.webp | PDF p15 r1c1; crop from inspected page render below badge and above caption; 392x407px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p15 r1c2 | pdf2026-p15-r1c2 / 8418-P | catalog/2026/previews/p15-r1c2.webp | PDF p15 r1c2; crop from inspected page render below badge and above caption; 392x407px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p17 r1c1 | pdf2026-p17-r1c1 / Песочный | catalog/2026/previews/p17-r1c1.webp | PDF p17 r1c1; crop from inspected page render below badge and above caption; 376x339px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p17 r1c2 | pdf2026-p17-r1c2 / Карамель | catalog/products/6011-2.webp | PDF p17 r1c2: exact SKU 6011-2; visual comparison with existing texture/object. Original photo resolution not certified. | confirmed_reused |
| p19 r1c1 | pdf2026-p19-r1c1 / YSY26107 | catalog/2026/previews/p19-r1c1.webp | PDF p19 r1c1; crop from inspected page render below badge and above caption; 389x303px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p19 r1c2 | pdf2026-p19-r1c2 / SY26128 | catalog/2026/previews/p19-r1c2.webp | PDF p19 r1c2; crop from inspected page render below badge and above caption; 388x303px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p19 r2c1 | pdf2026-p19-r2c1 / SY26138 | catalog/2026/previews/p19-r2c1.webp | PDF p19 r2c1; crop from inspected page render below badge and above caption; 389x304px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p19 r2c2 | pdf2026-p19-r2c2 / SY26135 | catalog/2026/previews/p19-r2c2.webp | PDF p19 r2c2; crop from inspected page render below badge and above caption; 388x304px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p21 r1c1 | pdf2026-p21-r1c1 / Венецианская, песок | catalog/2026/previews/p21-r1c1.webp | PDF p21 r1c1; crop below category badge and above caption; 386x368px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p21 r1c2 | pdf2026-p21-r1c2 / Венецианская, шампань | catalog/2026/previews/p21-r1c2.webp | PDF p21 r1c2; crop below category badge and above caption; 385x368px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p23 r1c1 | pdf2026-p23-r1c1 / Рейка, фактура ткань | catalog/products/6652-71.webp | PDF p23 r1c1: exact SKU 6652-71; visual comparison with existing texture/object. Original photo resolution not certified. | confirmed_reused |
| p23 r1c2 | pdf2026-p23-r1c2 / Рейка, металлик | catalog/products/009-A229.webp | PDF p23 r1c2: exact SKU 009-A229; visual comparison with existing texture/object. Original photo resolution not certified. | confirmed_reused |
| p23 r2c1 | pdf2026-p23-r2c1 / Венецианская штукатурка | catalog/2026/previews/p23-r2c1.webp | PDF p23 r2c1; crop from inspected page render below badge and above caption; 377x331px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p25 r1c1 | pdf2026-p25-r1c1 / Н-профиль — бронза | catalog/2026/previews/p25-r1c1.webp | PDF p25 r1c1; crop from inspected page render below badge and above caption; 375x327px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p25 r1c2 | pdf2026-p25-r1c2 / Н-профиль — золото | catalog/2026/previews/p25-r1c2.webp | PDF p25 r1c2; crop from inspected page render below badge and above caption; 377x327px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p25 r2c1 | pdf2026-p25-r2c1 / Н-профиль — серебро | catalog/2026/previews/p25-r2c1.webp | PDF p25 r2c1; crop from inspected page render below badge and above caption; 375x327px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p25 r2c2 | pdf2026-p25-r2c2 / Н-профиль — шампань | catalog/2026/previews/p25-r2c2.webp | PDF p25 r2c2; crop from inspected page render below badge and above caption; 377x327px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p26 r1c1 | pdf2026-p26-r1c1 / Н-профиль — чёрный | catalog/2026/previews/p26-r1c1.webp | PDF p26 r1c1; crop from inspected page render below badge and above caption; 379x325px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p26 r1c2 | pdf2026-p26-r1c2 / Угол внутренний | catalog/2026/previews/p26-r1c2.webp | PDF p26 r1c2; crop from inspected page render below badge and above caption; 378x325px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p26 r2c1 | pdf2026-p26-r2c1 / Угол наружный | catalog/2026/previews/p26-r2c1.webp | PDF p26 r2c1; crop from inspected page render below badge and above caption; 379x321px; no upscaling. Temporary preview, original photo required. | pdf_preview |
| p26 r2c2 | pdf2026-p26-r2c2 / П-профиль | catalog/2026/previews/p26-r2c2.webp | PDF p26 r2c2; crop from inspected page render below badge and above caption; 378x321px; no upscaling. Temporary preview, original photo required. | pdf_preview |

See `src/data/catalog2026.ts` for exact crop rectangles, individual source fields and source PDF hash.

## Differences requiring care

- Profiles p25: all four titles are Н-профиль; colors occur in subtitles. p26 r1c1 is the black connecting Н-профиль. Preserve subtitles; do not merge these five positions.
- p11 r2c2 has a texture, price 8000 ₽/лист and dimensions 1220 × 3000 × 7 mm, 18 kg, but no readable name/SKU. Keep in inventory only.
- p6 r1c3: Орех дымчатый is named, but the final SKU glyph I/1 cannot be resolved reliably. Public SKU must remain null until owner confirmation.
- Flexible stone: 2.5 mm, no listed weight. Slats: 155 × 3000 mm, no listed thickness/weight. Profiles: length 3 m and aluminium, no listed width/thickness/weight.
- Soft-touch: 7 mm / 13 kg according to its own cards; do not derive 18 kg from thickness.
- Existing seven exact-SKU products retain their identity, but their prices and, for 6011-2, thickness change.
- The introduction says 4-layer construction. Old source includes a five-layer marketing claim and invented per-layer masses; do not carry these into a universal specification.

## Implementation surface

`src/data/products.ts`, catalog UI, ProductModal, CartContext, telegramLink, Calculator, Quiz, Hero/Manifest/Specs/WhyUs/Compare/FAQ/ChatBot/CategoriesTeaser, source-aware production verifier, Node tests and CI. No hosting, DNS, credentials or new transport.

## Application integration

- `catalogModel.ts`: panel / flexible_stone / slat / profile; explicit priceRub, unit, dimensions; optional thickness/weight/material; nullable official SKU.
- `catalog2026.ts`: 46 reviewed source rows and provenance. Unidentified p11 r2c2 remains owner_review_required and never becomes orderable.
- `products.ts`: 45 public products, 9 categories, dynamic counts/ranges/price summary, optional-field details and safe filtering. No shared price/weight/thickness defaults. SKU-only cards display their actual SKU, not an invented name.
- Cart snapshots remain `{id, qty}` in domera-cart-v1. Seven old IDs have explicit verified mappings; nineteen unmatched old IDs are dropped, never replaced. Current price comes from the canonical product on restore/add.
- Calculator accepts only an explicitly selected sheet material; area uses its width and length. Slats/profiles are excluded. Invalid/zero calculations do not create drafts.
- Quiz suggests aesthetic categories, then requires user selection of a concrete product. No old SKU recommendation map or automatic fallback product.
- Telegram links retain the trusted destination and explicit user action, with current prices/units and optional official SKU; raw storage/technical IDs/quiz answers are excluded.
- Hero, Manifest, Specs, categories, FAQ, ChatBot, comparison summary and Offer prices use current data. Introductory panel construction is qualified; unsupported individual layer masses and blanket stock claims removed.
- Existing Installation service layout/content retained. Illustrative interior images are not presented as evidence for a specific current SKU.
- Production verifier checks actual mapped image paths, source eligibility and prices. CI runs test:catalog before artifact upload.

## Dependency audit correction

The mandatory audit exposed GHSA-68fv-2mgg-jv7q in the existing development chain Vite → PostCSS → source-map-js 1.2.1. A targeted lockfile-only patch updates source-map-js to 1.2.2; no React/Vite or other package versions changed. Advisory: https://github.com/advisories/GHSA-68fv-2mgg-jv7q. No untrusted visitor sourcemaps are processed by the static runtime.
