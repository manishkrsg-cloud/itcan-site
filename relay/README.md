# ITCAN website (Relay motion system)

Single-page site for ITCAN Pte Ltd, built on the Relay template's motion system: preloader ring and fold, a page-long three.js particle stream with bloom, spring physics throughout, scroll hand-offs between blocks, the logo iris through the red statement plate, and a cursor ring. ITCAN's red and blue replace the template's lime and sky.

## Layout

```
relay/
  server.js          zero-dependency Node server (gzip, ETag, CSP, /healthz)
  fetch-awards.mjs   Railway build step: downloads the 28 award photos
  fetch-services.mjs Railway build step: downloads the 7 hero card images (AI art made with Higgsfield)
  public/            what is served (built output is committed)
  web/               front-end source, built into public/ (not used by Railway)
    html/            page partials (one per section)
    css/             tokens, components and one file per section
    src/             motion engine, preloader, stream, transitions, sections
```

## Run locally

```bash
npm install && npm run build   # award photos into public/awards (optional)
npm start                      # http://localhost:3000
```

## Change the front end

```bash
cd web
npm install
npm run build        # writes public/index.html, public/404.html, public/js, public/css
```

Commit the rebuilt `public/` files. Railway only runs `npm run build` (award photos) and `npm start` in `relay/`.

Add `?nogl` to the URL to skip the WebGL stream (handy for screenshots and tests).

## Deploy on Railway

- Root directory `/relay`, build `npm run build`, start `npm start`, health check `/healthz`.
- If a photo could not be fetched at build time, the server redirects to the original on itcan.biz.

## Content map

| Section | Source on itcan.biz |
|---|---|
| Hero, numbers | Home page (960 projects, 1,200+ employees, 480 clients) |
| Services (4 rows) | /services/ |
| Practices strip (9) | /industrial-solutions/ |
| Awards dashboard + gallery (28 photos) | Home page awards slider, `public/data/awards.json` |
| About, vision, mission, values | /about-us/, /about-us/vision-and-mission/ |
| Careers, culture, testimonials | /career/corporate-culture/, home page |
| Videos, press | Home page (dead links shown as archived) |
| Offices (6), inboxes | /contact-us/ |

## Palette

| Token | Hex | Use |
|---|---|---|
| `--background` | `#000000` | page ground |
| `--accent` | `#FF3D48` | lines, dots, readouts on dark |
| `--accent-fill` / `--plate` | `#E5222E` | buttons and the statement plate (white text passes WCAG AA) |
| `--blue` / `--stream-alt` | `#6D88FF` | ITCAN blue lifted for dark screens |
| `--stream-core` | `#FFD6D9` | hottest part of the particle stream |

Fonts are self-hosted: Inter, Instrument Serif italic, Fragment Mono (all SIL OFL).

## Behaviour notes

- Reduced motion: no preloader, no WebGL loop, every spring lands at once.
- Crawlers and lab tools (Lighthouse, Googlebot and so on) get no preloader and no WebGL.
- Office clocks, "open now" dots and the time-zone lanes use each office's real local time.
- The brief form and the footer call-back form open the visitor's email app, routed to sales, jobs or info.
