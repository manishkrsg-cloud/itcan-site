# ITCAN website (Relay-style redesign)

Single-page site for ITCAN Pte Ltd. Dark, Relay-inspired layout with ITCAN's red and blue re-tuned for dark screens.

## Run locally

```bash
npm install        # optional: installs sharp for image resizing
npm run build      # downloads the 28 award photos from itcan.biz into public/awards
npm start          # http://localhost:3000
```

No framework. `server.js` is a zero-dependency Node server (gzip, caching, security headers, `/healthz`).

## Deploy on Railway

- Source: this folder (set **Root Directory** to `/relay` when the repo holds other sites).
- Build: `npm run build` (fetches award photos; never fails the build).
- Start: `npm start`. Health check: `/healthz`.
- If a photo could not be fetched at build time, the server redirects to the original on itcan.biz, so every award always shows.

## Content map

| Section | Source on itcan.biz |
|---|---|
| Hero, stats | Home page (960 projects, 1,200 employees, 480 clients) |
| Services (4) | /services/ |
| Industrial solutions (9) | /industrial-solutions/ |
| Awards (28 photos) | Home page awards slider, `public/data/awards.json` |
| About, vision, mission, values | /about-us/, /about-us/vision-and-mission/ |
| Careers, culture, testimonials | /career/corporate-culture/, home page |
| Videos, press | Home page (dead links shown as archived) |
| Offices (6), emails | /contact-us/ |

## Palette

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#07080C` | page ground |
| `--red` | `#E5222E` | buttons, badges (white text passes WCAG AA) |
| `--red-hi` | `#FF4D57` | accents and lines on dark |
| `--blue` | `#6D88FF` | ITCAN blue lifted for dark screens |
| `--text` | `#EEF0F6` | body text |

Fonts are self-hosted (Inter Tight, Inter, Instrument Serif, JetBrains Mono, all SIL OFL).

## Contact form

The brief form validates input, routes to the right inbox (sales, jobs or info) and opens the visitor's email app with the message filled in. A copy button covers visitors without a mail app. To store enquiries server-side later, add a POST endpoint in `server.js` and an email provider key.
