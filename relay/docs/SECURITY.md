# Security: ITCAN website

Reviewed 1 Oct 2026 against `relay/server.js` and the live service (relay-site-production.up.railway.app).

## 1. What there is to protect

The site is static. There is no login, database, API or server-side form handling, and no secrets at runtime. Forms open the visitor's email app, so ITCAN's server never receives personal data.

The real assets are:

1. **The brand and the domain:** defacement, or the site being framed or used for phishing.
2. **The deploy path:** the GitHub repo, the Railway project and the tokens that can publish to it.
3. **Visitor trust:** no tracking without consent (Singapore PDPA), no third-party script execution.

## 2. Controls in place (verified on the live service)

| Control | Setting |
|---|---|
| Content-Security-Policy | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: https://www.itcan.biz https://i.ytimg.com; frame-src https://www.youtube-nocookie.com https://www.youtube.com; connect-src 'self'; base-uri 'self'; form-action 'self' mailto:; frame-ancestors 'self'` |
| Strict-Transport-Security | `max-age=31536000; includeSubDomains` |
| X-Frame-Options | `SAMEORIGIN` (also `frame-ancestors 'self'`) |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Permissions-Policy | camera, microphone and geolocation off |
| Cross-Origin-Opener-Policy | `same-origin` |
| Methods | GET and HEAD only; `POST /` returns 405 (checked) |
| Path traversal | Decoded path is normalised and must sit under `public/`; `/%2e%2e/server.js` returns 404 (checked) |
| Dependencies | None at runtime. Build uses esbuild, three, lenis and fontsource (front end) and optional `sharp` (photo fetch). |
| Inline script | None; the CSP blocks inline script, and the theme pre-paint runs from `/js/theme.js`. |

## 3. Findings

| ID | Severity | Finding | Fix |
|---|---|---|---|
| SEC-01 | Low | `absPath.startsWith(ROOT)` has no trailing separator, so a sibling folder whose name starts with `public` (for example `public-old/`) would be reachable with an encoded `../`. No such folder exists in the deployed tree today. | `if (!absPath.startsWith(ROOT + path.sep))` |
| SEC-02 | Low | `/healthz`, the 500 response and the award-photo 302 are sent without the security headers. | Spread `SECURITY_HEADERS` into those three responses. |
| SEC-03 | Low | `style-src 'unsafe-inline'` is needed because the motion engine writes inline styles. That is acceptable because script is locked to `'self'`, but it widens CSS-injection impact. | Leave for now; revisit if user content is ever rendered. |
| SEC-04 | Info | Brotli quality 11 runs synchronously on the first request for each file. It is cached afterwards and the file set is fixed, so the cost is bounded. | Optional: pre-compress at build time. |
| SEC-05 | Medium (process) | Deploy credentials: a Railway **workspace** token (reaches every itcanbiz project) and a project token for `relay-site` are stored in plain text in the ITCAN Hub `deploy/.env` (gitignored). | Keep the file out of every repo and backup sync. Prefer the project-scoped token. Rotate both if the machine is shared or lost. |
| SEC-06 | Info | The award-photo fallback redirects to `www.itcan.biz`. Once the WordPress site is retired, those URLs will 404 (a broken image, not a security issue). | Make sure the Railway build fetches all 28 photos; remove the fallback after cut-over. |
| SEC-07 | Info | The HSTS header has no `preload`. | Add `preload` and submit to hstspreload.org once on the itcan.biz domain, if every subdomain is HTTPS. |

## 4. Privacy (PDPA)

- No cookies, analytics or tracking scripts. `localStorage` holds only the theme choice.
- YouTube embeds use `youtube-nocookie.com`.
- The privacy notice at `/privacy-policy/` describes the mailto-only data flow. It needs ITCAN review before go-live (ISSUES.md, ISS-11).
- Any future analytics needs a consent decision and a privacy-notice update first.

## 5. Rules for changes

1. No inline `<script>`: add a file under `public/js/`. The CSP will block anything else.
2. A new third-party origin needs a matching CSP entry and a line in this document.
3. Never commit `.env`, `urls.env` (the film upload URLs) or Railway tokens.
4. If a server-side form is ever added, it needs input validation, rate limiting, CSRF protection, a spam control, and a PDPA review before release.

## 6. Reporting

Send security concerns to info@itcan.biz, marked "Security".
