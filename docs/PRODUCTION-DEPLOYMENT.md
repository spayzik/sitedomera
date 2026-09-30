# Домэра: подготовка статического production deployment

Этот документ — план для будущего размещения, а не подтверждение, что REG.RU уже настроен. Не меняйте DNS и не загружайте сайт, пока владелец не подтвердит параметры хостинга. Публикуется **содержимое `dist/`**, а не весь репозиторий и не папка `dist` как вложенный каталог.

## Контракт сборки

```text
source repository → npm ci → npm run build → npm run verify:production → dist/* → document root
```

- Production: `https://домэра.рф/` (`https://xn--80ahyhl1f.xn--p1ai/`). Это единственный canonical origin.
- Vite `base: './'`: собранные JS/CSS, favicon и шрифты в `dist/index.html` имеют относительные пути. Изображения каталога и `generated/avito-reviews.json` также разрешаются относительно документа.
- GitHub Pages остаётся preview на подпути `/sitedomera/`; относительные assets должны работать там. Его canonical, OG и sitemap намеренно указывают на production. `CNAME` для production на Pages не нужен.
- Маршруты `#/catalog`, `#/privacy`, `#/offer` и якоря обрабатываются браузером. Серверный SPA rewrite для текущего hash-router не нужен.
- Сборка работает без `VITE_YM_ID`: в этом случае аналитика и её consent UI отключены. Настроенный числовой ID публичен; Метрика загружается только после согласия.
- `npm run sync:avito` **не входит** в обычную сборку. Без подтверждённых API credentials и доступа Ratings остаётся fallback-ссылка на Авито. Синхронизацию настраивать отдельно.

## OWNER / HOSTING INPUT REQUIRED до deploy

- [ ] Куплен и назван точный тариф REG.RU; подтверждены возможности именно этой услуги.
- [ ] Получены фактический document root, способ загрузки (FTP, FTPS или SFTP), отдельные credentials вне Git и права на каталог.
- [ ] Получены реальные DNS-значения от хостинга. Не использовать предполагаемый IP.
- [ ] Подтверждены механизм SSL, настройка HTTP/host redirects, поддержка `.htaccess`, custom headers, cache controls и error pages.
- [ ] Решено, обслуживается ли `www.домэра.рф`. Если да, он должен вести на canonical apex; если нет — не публиковать его как альтернативный сайт.
- [ ] Подтверждены правовые и товарные сведения из `OWNER-LEGAL-CHECKLIST.md` перед публичным запуском.

## DNS, HTTPS и redirects

1. Настраивать apex `домэра.рф` / `xn--80ahyhl1f.xn--p1ai` по выданным REG.RU A/AAAA/CNAME параметрам. Не подставлять IP из примеров.
2. Включить валидный TLS-сертификат и проверить открытие `https://домэра.рф/` с браузера и командой `curl -I`.
3. Настроить `http://домэра.рф/` → `https://домэра.рф/`; при использовании `www` направить его на тот же apex. Проверить цепочку для путей, query и отсутствие циклов.
4. Конкретный redirect config писать только после подтверждения стека и возможностей выбранного тарифа.
5. HSTS рассматривать после проверки HTTPS и redirects на реальном сервере; не включать preload автоматически.

## Загрузка

1. На чистом checkout выполнить команды контракта сборки. Проверить, что `npm run verify:production` завершился успешно.
2. Проверить состав `dist/`: там нет `.env`, `.git`, исходников, scripts, fixtures, локальных credentials и source maps.
3. Загрузить **только файлы и каталоги внутри `dist/`** в подтверждённый document root. Не загружать `.git`, `src`, `public` отдельно, `node_modules`, `docs`, `.github` или секреты.
4. Проверить MIME types, отсутствие directory listing, корректный ответ на несуществующий asset и недоступность `/.env`, `/.git/config`, `/src/App.tsx`, `/package.json`.
5. Не включать автоматическую публикацию на REG.RU до отдельного решения о доступе и протоколе.

## Внешняя сеть и будущая политика заголовков

| Режим | Сервис | Причина |
|---|---|---|
| Автоматически при приближении блока к экрану | `yandex.ru/map-widget/v1/` и связанные ресурсы Яндекса | Встроенный lazy iframe карты в контактах |
| После согласия | `mc.yandex.ru/metrika/tag.js` и запросы счётчика | Яндекс.Метрика при валидном `VITE_YM_ID` |
| Только после клика | `t.me`, `www.avito.ru`, `tel:` и переход на Яндекс.Карты | Контакты, Telegram drafts и маршрут |
| Вне браузера, вручную/CI при настройке | `api.avito.ru` | Build-time sync отзывов; в visitor browser API не вызывается |

Кандидаты для проверки на реальном сервере: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, ограничивающий `Permissions-Policy`, защита от embedding (`frame-ancestors` или проверенный эквивалент), затем HSTS. Сначала снять фактический Network inventory Метрики, карты и локальных assets; только после этого проектировать и испытывать CSP. Эти заголовки **пока не заявлены как включённые**. Дополнительные проверки — в `SECURITY-DEPLOYMENT-CHECKLIST.md`.

## Cache strategy после проверки хостинга

- Hashed Vite assets в `assets/` — долгий `immutable` cache после проверки MIME и обновления релизов.
- `index.html` — короткий cache или обязательная revalidation, чтобы новые chunk URLs доходили до пользователей.
- `generated/avito-reviews.json` — короткий cache/revalidation: snapshot должен обновляться после будущего sync.
- Images и fonts с неизменяемыми URL можно кэшировать долго лишь при версии/инвалидации при их замене.
- `robots.txt` и `sitemap.xml` должны обновляться своевременно. Точные правила задавать только после подтверждения конфигурации хостинга.

## Production smoke test после будущей загрузки

- [ ] `/`, JS/CSS chunks, fonts, оба Hero, первые и последующие catalog images, `/generated/avito-reviews.json`, `/robots.txt`, `/sitemap.xml`, `/catalog/og-cover.jpg` отвечают 200 с верными MIME types.
- [ ] TLS валиден; HTTP и используемые альтернативные hostnames перенаправляют на canonical HTTPS без циклов.
- [ ] Canonical, Open Graph, JSON-LD, robots и sitemap указывают на `https://xn--80ahyhl1f.xn--p1ai/`.
- [ ] Главная, категории, интерьеры, полный каталог из 26 товаров, ProductModal и hover карточек работают на desktop и mobile.
- [ ] Корзина, калькулятор, квиз и Telegram drafts показывают актуальные данные; пользователь сам отправляет сообщение.
- [ ] Авито fallback/отзывы, телефон, Telegram, карта, построение маршрута и внешние ссылки работают.
- [ ] Без согласия Метрика не загружается; принятие и отказ сохраняются, изменение выбора работает. Карта загружается независимо от analytics consent при приближении iframe к viewport.
- [ ] Сняты реальные Network/headers/cache результаты и внесены в журнал запуска; проверена недоступность приватных файлов и отсутствие source maps.

STOP: без реальных параметров REG.RU, DNS и TLS этот checklist не означает, что production опубликован или проверен.
