# Security checks for REG.RU Host-Lite deployment

This is a verification plan, not a statement that any setting is active. Publish only the contents of `dist/`. Confirm the actual Host-Lite server and control-panel capabilities before adding `.htaccess` or changing headers. REG.RU documents `.htaccess` for Apache-based virtual hosting, but this site's purchased service has not yet been tested.

## Transport and host

- [ ] Confirm a valid HTTPS certificate for `xn--80ahyhl1f.xn--p1ai` (displayed to visitors as `домэра.рф`).
- [ ] Check HTTP → HTTPS and alternate-host → canonical-host redirects with `curl -I` and a browser, including paths and query strings. Avoid redirect loops.
- [ ] Check the served canonical URL, sitemap, robots file, and Open Graph URLs against the final host.
- [ ] Consider HSTS only after HTTPS and redirects work reliably for the intended host and subdomains. Do not enable preload without separate review.

## Files and responses

- [ ] Confirm directory listing is disabled. Request a directory without an index file.
- [ ] Confirm hidden and source files such as `/.env`, `/.git/config`, `/package.json`, and `/src/App.tsx` are absent or denied. Confirm only intended files from `dist/` were uploaded.
- [ ] Check unknown paths and missing assets return the intended 404/error page, without exposing server paths or configuration.
- [ ] Check MIME types for HTML, JavaScript, CSS, SVG, images, fonts, XML, and `robots.txt`; use `nosniff` only after types are correct.
- [ ] Check caching: HTML and metadata can be refreshed promptly; content-hashed assets may use long immutable caching. Verify updates propagate.
- [ ] Confirm whether `.htaccess` works on this exact Host-Lite service and which directives are permitted. Test changes on a staging path before production.

## Header baseline to test on the real server

These are candidate settings, not active configuration:

- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin` as a site-wide starting point; the embedded Yandex map currently sets the same policy. Verify external flows.
- `Permissions-Policy` limiting unused features such as camera, microphone, and geolocation, after checking the embedded map.
- Clickjacking protection: test `X-Frame-Options: DENY` or an equivalent `frame-ancestors` policy after confirming this site need not be embedded elsewhere.
- `Strict-Transport-Security` only after the HTTPS check above.
- Plan a Content Security Policy after recording the production network inventory for local assets, Yandex Metrika after consent, and the lazy Yandex Maps iframe as it approaches the viewport. Do not deploy a guessed CSP that blocks the site or its optional services.

For each header, inspect the actual response on the canonical HTTPS host and on redirects/error pages. A repository file alone does not prove the header is served.

## Browser/network acceptance

- [ ] Before analytics choice, verify no Yandex Metrika script or request; verify when the lazy Yandex Maps iframe starts loading as its section approaches the viewport.
- [ ] After analytics consent and map loading, record all resulting third-party origins in browser Network tools. Use that inventory to design and test CSP.
- [ ] Verify rejection, later consent changes, Telegram/Avito links, telephone link, map route, cart, and chatbot on desktop and mobile.
- [ ] Verify no source maps or private build inputs are published, and inspect the final `dist/` for test URLs, secrets, and old-domain references.
