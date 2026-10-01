# ITCAN website: project overview

The single-page marketing site for ITCAN Pte Ltd, replacing the WordPress site at itcan.biz.

| | |
|---|---|
| Live (preview) | https://relay-site-production.up.railway.app |
| Repository | `manishkrsg-cloud/itcan-site`, folder `relay/` |
| Hosting | Railway, project "ITCAN CORP WEBSITE DEMO", service `relay-site`, environment `production` |
| Owner | Manish Kumar |
| Status | Live preview. Not yet on the itcan.biz domain. |
| Last update | 1 Oct 2026: mobile UX pass (see ISSUES.md, "Closed") |

## Documents

| File | What it answers |
|---|---|
| [PRD.md](PRD.md) | What the site is for, who uses it, what it must do |
| [TRD.md](TRD.md) | How it is built, served, deployed and tested |
| [ISSUES.md](ISSUES.md) | Known defects and the backlog, by priority |
| [SECURITY.md](SECURITY.md) | Threat model, controls in place, findings and fixes |

## Repository layout

```
relay/
  server.js            zero-dependency Node server (compression, ETag, CSP, /healthz, legacy redirects)
  fetch-awards.mjs     build step: downloads the 28 award photos
  fetch-services.mjs   build step: downloads the generated photographs as webp
  public/              what is served (built output, committed)
  web/                 front-end source, built into public/ (not run on Railway)
    html/              one partial per section, plus legal page bodies
    css/               tokens, components, one file per section, mobile.css, light theme
    src/               motion engine, preloader, WebGL stream, sections
  film/                source for the "Watch our story" film (rendered outside Railway)
  docs/                these documents
```

## Day-to-day workflow

```bash
cd relay/web && npm install && npm run build   # rebuild public/ after editing web/
cd .. && PORT=4173 npm start                   # preview at http://localhost:4173 (add ?nogl to skip WebGL)
git add -A && git commit && git push           # main deploys to Railway automatically
```

Photos are downloaded during the Railway build, so a local preview shows empty photo frames unless you also run `npm run build` in `relay/`.

## Sections (top to bottom)

Hero with service card carousel, Practices (9), Services (4 rows), Sectors (10), Statement plate, Offices (6, with globe and live time zones), Awards (28, dashboard plus coverflow), Numbers and testimonials, About, Careers, Media, Ways to engage, Contact, Footer. Legal pages: `/terms-of-use/`, `/privacy-policy/`, `/disclaimer/`.

## Open decisions

1. Domain cut-over from itcan.biz (DNS, redirects for old WordPress URLs are already in `server.js`).
2. Privacy policy text needs ITCAN review before go-live.
3. GitHub push permission for the deploy account (see ISSUES.md, ISS-01).
