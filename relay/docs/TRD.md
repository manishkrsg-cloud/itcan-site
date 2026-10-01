# Technical requirements and design: ITCAN website

Version 1.1, 1 Oct 2026.

## 1. Architecture

```
Browser ──HTTPS──> Railway edge ──> Node 20 server.js ──> relay/public/ (static files)
                                         │
                                         └─302─> www.itcan.biz/wp-content/uploads/ (award photo fallback)
```

- **No backend logic, no database, no secrets at runtime.** The server only serves files, compresses them, sets headers and redirects.
- **Forms are mailto links.** Nothing a visitor types reaches the server.
- **Third parties at runtime:** YouTube (embedded film and press videos, via youtube-nocookie.com), `i.ytimg.com` thumbnails, and `www.itcan.biz` for any award photo the build could not download.

## 2. Front end

| Concern | Choice |
|---|---|
| Markup | Plain HTML partials in `web/html/`, stitched by `build.mjs` with `<!--#include name-->` |
| Styles | Plain CSS in `web/css/`, bundled by esbuild into `public/css/site.css` |
| Scripts | ES modules in `web/src/`, bundled by esbuild (ESM, code-split; the WebGL stream is a lazy chunk) |
| Motion | Own spring engine (`src/core/engine.js`), Lenis smooth scroll, three.js particle stream with bloom |
| Fonts | Geist and Geist Mono, self-hosted (SIL OFL) |
| Themes | Dark by default; `data-theme="light"` on `<html>`, stored in `localStorage["itcan-theme"]` |
| Cache busting | `?v=<build timestamp>` on CSS and JS; lazy chunks are content-hashed |

### Layout system

Four drawn frames: 1440 (desktop), 1200, 900 (tablet) and 580 (phone), set as CSS custom properties in `web/css/base.css` (`--page-width`, `--page-inset`, type scale). Many art panels use absolute positioning in a `--u` unit scaled to the frame. Phone overrides live in each section's CSS file and in `web/css/mobile.css`.

### Mobile rules (1 Oct 2026)

All in the "mobile UX pass" block at the end of `web/css/mobile.css`, plus:

- `--letter-spacing-title` is `-0.045em` (was a fixed `-0.125rem`), easing to `-0.03em` at ≤900px and `-0.025em` at ≤580px.
- Phone section titles are 30px / 36px line height (was 24 / 32).
- `.nav-plate` at ≤900px: `rgba(5,6,9,0.9)` with an 18px blur; the light theme uses `rgba(244,245,248,0.92)`.
- At ≤580px the header theme button is hidden. A second `[data-theme-toggle]` sits in the menu card (`.menu-theme`); `initTheme()` already binds every toggle.
- Minimum tap height of 2.75rem (44px) for `.pr-chip`, `.of-map`, `.ft-social a`, and the tel: and mailto: links in office cards.
- **Bottom dock (≤580px):** `.nav-actions` becomes a fixed pill at the bottom (`--dock-h` 3.75rem, above `env(safe-area-inset-bottom)`). `body` gets matching bottom padding. The menu card is fixed above the dock and opens upward as a two-column sheet. `.nav` must keep no transform or filter, or the fixed dock would position relative to it.
- **Sectors on phones:** `sectors.js` runs the stack-to-spread animation when `(max-width: 580px) and (min-height: 600px)`, using the `LP` layout (3+2 above, 2+3 below). The spread band excludes the dock height (`--ss-bot`). Tablets (581–1000px) keep the static grid.
- **Hero coverflow on phones:** the active card is `(width − 40px)`, so it lines up with the 20px page margins.

### Motion and accessibility

- `prefers-reduced-motion`: no preloader, no WebGL loop, springs jump to their end state.
- Crawlers and lab tools get no preloader and no WebGL (`src/gate.js`).
- `?nogl` skips the WebGL stream (screenshots, tests).
- If WebGL cannot start, the stream fails quietly and the page works without it.

## 3. Server (`server.js`)

| Feature | Detail |
|---|---|
| Methods | GET and HEAD only; others get 405 |
| Compression | Brotli (q11) or gzip (level 9) for text over 1KB, cached in memory per file and mtime |
| Caching | Hashed chunks and `?v=` assets: 1 year, immutable. HTML, CSS, JS and JSON: `no-cache` plus ETag. `/assets/`: 7 days |
| Ranges | Byte ranges for video (Safari needs them) |
| Redirects | Legacy WordPress paths, 301 to section anchors; legal paths get a trailing slash |
| Health | `GET /healthz` returns `ok` |
| Headers | See SECURITY.md |

## 4. Build and deploy

| Step | Where | Command |
|---|---|---|
| Front-end build | Developer machine | `cd relay/web && npm run build` (writes `public/`, which is committed) |
| Photo fetch | Railway build | `npm run build` in `relay/` (`fetch-awards.mjs`, `fetch-services.mjs`; uses `sharp` if present) |
| Start | Railway | `npm start`, health check `/healthz`, restart on failure (5 retries) |

**Railway service settings:** root directory `/relay`, source repo `manishkrsg-cloud/itcan-site`, branch `main`.

**Two ways to deploy:**

1. Push to `main` (normal route; Railway builds from GitHub).
2. CLI upload from the repo root: `RAILWAY_TOKEN=<project token> railway up --service relay-site --detach`. The project token is stored as `RAILWAY_TOKEN_RELAY_SITE` in the ITCAN Hub `deploy/.env`. Use this only when a push is blocked, then push the same commit so the repo and the live site match.

## 5. Testing

No automated suite. Before each deploy:

1. `npm run build` passes.
2. Local preview at 390×844 and 1440×900, in both themes, checking: no horizontal scroll (`document.documentElement.scrollWidth === innerWidth`), no overlapping text, the menu opens and closes, theme toggles.
3. After deploy: `/healthz` returns 200, the served `site.css?v=` stamp matches the build, and a mobile screenshot pass is done.

Recommended additions (ISS-10): Playwright smoke test of the checks above, plus Lighthouse CI on mobile.

## 6. Constraints

- Node 20 or newer; no runtime dependencies (`sharp` is optional and only used at build).
- The CSP allows no inline scripts, so any new script must be a file under `public/js/`.
- `public/` is the deploy artefact: always rebuild and commit it with any `web/` change.
