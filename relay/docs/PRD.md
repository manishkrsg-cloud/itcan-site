# Product requirements: ITCAN website

Version 1.1, 1 Oct 2026 (adds the mobile requirements in section 6).

## 1. Purpose

Give ITCAN a website that wins enterprise IT services and staffing work across Asia Pacific, and that recruits engineers. It replaces the WordPress site at itcan.biz with one fast page that explains what ITCAN does, proves it, and gets the visitor to send a brief.

## 2. Audiences

| Audience | What they need | Primary action |
|---|---|---|
| Enterprise buyers (CIO, IT head, procurement) in SG, MY, AU, HK, IN, ID | What ITCAN delivers, in which sectors, at what scale, with what proof | Send a brief, request a call back |
| Hiring managers needing contract talent | Speed, team shapes, on-site vs offshore | "Build your team", talk to a consultant |
| Candidates | Culture, how to apply | Send CV to jobs@itcan.biz |
| Press and partners | Awards, coverage, company facts | Read media, contact media@itcan.biz |

## 3. Goals and measures

| Goal | Measure | Target |
|---|---|---|
| Turn visits into enquiries | Brief and call-back submissions per 1,000 visits | Baseline in the first month, then +25% |
| Look credible to enterprise buyers | Awards, numbers and offices reachable within two scrolls of the hero | Yes |
| Work on phones | Mobile Lighthouse accessibility score; no horizontal scroll at 360–430px | ≥ 95; none |
| Load fast | Largest Contentful Paint on 4G mobile | < 2.5s |
| Keep search ranking | Old WordPress URLs return 301 to the matching section | All mapped URLs |

## 4. Scope

**In scope:** the single page and its sections (see PROJECT.md), light and dark themes, three legal pages, the story film, the 404 page, redirects from the old site.

**Out of scope:** a CMS, blog, job board, client portal or server-side form handling. Forms open the visitor's email app (mailto).

## 5. Functional requirements

| ID | Requirement |
|---|---|
| F-01 | The hero states what ITCAN is in one sentence and offers two actions: start a project, watch the story. |
| F-02 | Practices: nine practices; selecting one shows what is delivered and how it connects to the others. |
| F-03 | Services: four services, each with a short worked example. |
| F-04 | Sectors: ten sectors with a photograph each. |
| F-05 | Offices: six offices with address, contact, local time, open/after-hours state and a maps link. |
| F-06 | Awards: 28 awards filterable by kind, each photo viewable full size. |
| F-07 | Numbers: projects, people and clients, plus three staff testimonials. |
| F-08 | Engage: a team-size estimator that suggests a model (consult, team, run). |
| F-09 | Contact: a brief form (name, work email, company, need, brief) routed to the right inbox; a footer call-back form. |
| F-10 | The visitor can switch between light and dark themes, and the choice is remembered. |
| F-11 | Every section is reachable from the navigation and by URL fragment. |
| F-12 | Old itcan.biz paths redirect (301) to the matching section. |

## 6. Mobile requirements (added 1 Oct 2026)

| ID | Requirement | Status |
|---|---|---|
| M-01 | No horizontal scroll from 360px up. | Met |
| M-02 | Headings stay legible: letter spacing scales with type size, so words never touch. | Met |
| M-03 | The header is opaque enough that content scrolling beneath it does not show through. | Met |
| M-04 | The phone header holds three items only: logo, "Talk to us", menu. Theme lives in the menu. | Met |
| M-05 | Every tap target is at least 44px tall. | Met for chips, maps buttons, footer and contact links; award grid cells open (ISS-07) |
| M-06 | Section heads align with the content below them (left on phones). | Met |
| M-07 | No text overlaps other text at rest, at any scroll position. | Met (the statement iris and the sectors fan are scroll choreography) |
| M-08 | Body text is at least 16px; form inputs are 16px so iOS does not zoom. | Met |
| M-09 | Primary actions (Talk to us, menu) are in thumb reach at the bottom of the screen. | Met (bottom dock) |
| M-10 | Phones get the same content and motion as desktop: no section or chart is dropped. | Met (sectors animation and the awards chart restored) |
| M-11 | Cards share the 20px page margins. | Met |

## 7. Non-functional requirements

- **Accessibility:** WCAG 2.2 AA. Visible focus, keyboard reachable, alt text on all images, skip link, reduced-motion support (no preloader, no WebGL, springs land at once).
- **Performance:** text compressed (brotli or gzip), hashed assets cached for a year, HTML revalidated on every load so a deploy shows at once.
- **Privacy:** no analytics or third-party trackers without a consent decision; PDPA notice published.
- **Brand:** ITCAN red `#E5222E` and blue, Geist type, no stock emoji icons.

## 8. Release criteria for the itcan.biz cut-over

1. All P1 issues in ISSUES.md closed.
2. Privacy policy approved by ITCAN.
3. Lighthouse mobile: performance ≥ 80, accessibility ≥ 95.
4. Redirects checked against the live WordPress sitemap.
