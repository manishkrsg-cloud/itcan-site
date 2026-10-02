# Seed entries for the ITCAN_CorpSite knowledge base. Run: python3 entries.py > 002_kb_seed.sql
# Each entry: (slug, topic, title, body, tags, source, status)

E = [
# ---------------------------------------------------------------- Overview
("site-overview", "Overview", "What the ITCAN corporate site is",
 "Single-page marketing site for ITCAN Pte Ltd that replaces the WordPress site at itcan.biz. Built on the Relay motion system: preloader, a page-long three.js particle stream, spring physics, a red statement plate with a logo iris, and a cursor ring. ITCAN red #E5222E and blue replace the template colours. Live preview: https://relay-site-production.up.railway.app (not yet on itcan.biz). Repo: manishkrsg-cloud/itcan-site, folder relay/. Hosting: Railway project 'ITCAN CORP WEBSITE DEMO', service relay-site, environment production.",
 ["overview", "hosting", "repo"], "relay/docs/PROJECT.md", "current"),
("sections-map", "Overview", "Section order and URL anchors",
 "Top to bottom: Hero with service card carousel (#top), Practices (9, #integrations), Services (4 rows, #product), Sectors (10, #sectors), Statement plate (#statement), Offices (6, globe and live time zones, #scale), Awards (28, dashboard and coverflow, #signals), Numbers and testimonials (#proof), About (#about), Careers (#careers), Media (#media), Ways to engage (#pricing), Contact (#contact), Footer. Legal pages: /terms-of-use/, /privacy-policy/, /disclaimer/. Nav labels differ from anchors: Practices=#integrations, Services=#product, Offices=#scale, Awards=#signals, Numbers=#proof, Teams=#pricing.",
 ["sections", "anchors", "navigation"], "web/html/nav.html", "current"),

# ---------------------------------------------------------------- Architecture
("static-server", "Architecture", "server.js: zero-dependency static server",
 "Node 20, no runtime dependencies. Serves relay/public, GET and HEAD only (405 otherwise). Brotli q11 or gzip 9 for text over 1KB, cached in memory per file and mtime. Cache: hashed chunks and ?v= assets 1 year immutable; HTML/CSS/JS/JSON no-cache with ETag; /assets/ 7 days. Byte ranges for video (Safari). Legacy WordPress paths 301 to section anchors. /healthz returns ok. Award photos missing at build 302 to www.itcan.biz/wp-content/uploads.",
 ["server", "caching", "redirects"], "relay/server.js", "current"),
("build-pipeline", "Architecture", "Front-end build: web/ to public/",
 "web/build.mjs stitches web/html partials with <!--#include name--> into public/index.html, bundles web/css/index.css into public/css/site.css and web/src/main.js into public/js (ESM, code-split; the WebGL stream is a lazy hashed chunk) with esbuild. Stamps ?v=<build timestamp> on CSS and JS. Writes the three legal pages from one template. public/ is committed and is the deploy artefact; Railway does not run the front-end build.",
 ["build", "esbuild", "public"], "web/build.mjs", "current"),
("photo-fetch-at-build", "Architecture", "Photos are downloaded during the Railway build",
 "npm run build in relay/ runs fetch-awards.mjs (28 award photos) and fetch-services.mjs (generated photographs as webp, uses sharp if present). They are gitignored, so a local preview shows blank photo frames unless you run that build locally. If an award photo failed to download, server.js redirects to the original on itcan.biz; that fallback breaks once WordPress is retired.",
 ["build", "photos", "railway"], "fetch-awards.mjs, fetch-services.mjs", "current"),
("motion-engine", "Architecture", "Motion: springs, Lenis, three.js stream",
 "Own spring engine (web/src/core/engine.js), Lenis smooth scroll, three.js particle stream with bloom (lazy chunk). prefers-reduced-motion: no preloader, no WebGL loop, springs land at once. Crawlers and lab tools get no preloader and no WebGL (src/gate.js). Add ?nogl to skip the stream for screenshots and tests. If WebGL cannot start, the stream fails quietly and the page still works.",
 ["motion", "webgl", "accessibility"], "web/src", "current"),
("layout-frames", "Architecture", "Four layout frames and the --u unit",
 "Breakpoint frames 1440 (desktop), 1200, 900 (tablet) and 580 (phone), set as custom properties in web/css/base.css (--page-width, --page-inset, type scale). Many art panels are absolutely positioned in a --u unit scaled to the frame, so overlaps are fixed by adjusting top/left in calc(N * var(--u)). Phone overrides live in each section's CSS and in web/css/mobile.css.",
 ["layout", "responsive", "css"], "web/css/base.css", "current"),
("themes", "Architecture", "Light and dark themes",
 "Dark by default. Light sets data-theme=\"light\" on <html>, remembered in localStorage itcan-theme. initTheme() in src/ui.js binds every [data-theme-toggle], so the header button and the phone menu's Light theme row both work. Legal pages read the saved theme before first paint from /js/theme.js (no inline script under the CSP).",
 ["theme", "dark-mode"], "web/src/ui.js", "current"),

# ---------------------------------------------------------------- Rules
("rule-rebuild-public", "Rules", "Always rebuild and commit public/ with any web/ change",
 "Railway serves public/ as committed. After editing web/, run npm run build in web/ and commit the regenerated public/ files (index.html, css/site.css, js/, legal pages) in the same commit.",
 ["build", "deploy"], "README.md", "current"),
("rule-no-inline-script", "Rules", "No inline script: the CSP blocks it",
 "script-src is 'self' only. Any new script must be a file under public/js/. Inline style attributes are allowed (style-src 'unsafe-inline') because the motion engine writes inline styles.",
 ["security", "csp"], "relay/server.js", "current"),
("rule-new-origin-csp", "Rules", "A new third-party origin needs a CSP entry and a SECURITY.md line",
 "Allowed today: YouTube (youtube-nocookie.com, youtube.com frames), i.ytimg.com thumbnails, www.itcan.biz images. Adding analytics, fonts or embeds from anywhere else means updating the CSP in server.js and SECURITY.md, and, for tracking, a PDPA consent decision first.",
 ["security", "csp", "privacy"], "relay/docs/SECURITY.md", "current"),
("rule-tap-targets-44", "Rules", "Phone tap targets are at least 44px",
 "Chips, maps buttons, footer icons, filter tabs and the tel:/mailto: links in office cards have a 2.75rem minimum height on phones. New buttons on phones follow the same floor.",
 ["mobile", "accessibility"], "web/css/mobile.css", "current"),
("rule-title-tracking-em", "Rules", "Heading letter-spacing is in em, never fixed rem",
 "--letter-spacing-title is -0.045em (desktop), -0.03em at 900px and below, -0.025em at 580px and below. A fixed -0.125rem made phone headings run words together. Use em for any new heading tracking.",
 ["typography", "mobile"], "web/css/base.css", "current"),
("rule-page-margins", "Rules", "Cards sit on the 20px phone page margins",
 "On phones every card spans the page width minus 20px each side, including the hero coverflow card (spectra.js sizes it as width - 40). Section heads are left-aligned on phones to match the cards.",
 ["mobile", "layout"], "web/css/mobile.css", "current"),
("rule-nav-no-transform", "Rules", "Never give .nav a transform or filter",
 "On phones .nav-actions (Talk to us + menu) is position: fixed at the bottom of the viewport. A transform, filter or backdrop-filter on .nav or .nav-row would make it fixed to the header instead and break the dock. The blur lives on the sibling .nav-plate.",
 ["mobile", "navigation", "css"], "web/css/mobile.css", "current"),
("rule-no-secrets", "Rules", "Never commit secrets",
 "Do not commit .env, film/urls.env (presigned upload URLs) or Railway tokens. Deploy tokens live in ITCAN-Hub/deploy/.env on MK's machine only.",
 ["security", "secrets"], "relay/docs/SECURITY.md", "current"),
("rule-mailto-forms", "Rules", "Forms are mailto: nothing personal reaches the server",
 "The brief form and footer call-back open the visitor's email app, routed to sales, jobs or info. Adding a server-side form needs input validation, rate limiting, CSRF protection, spam control and a PDPA review first.",
 ["forms", "privacy", "pdpa"], "relay/docs/PRD.md", "current"),

# ---------------------------------------------------------------- Operations
("deploy-push", "Operations", "Normal deploy: push to main",
 "Railway service relay-site builds from GitHub manishkrsg-cloud/itcan-site, branch main, root directory /relay, build npm run build, start npm start, health check /healthz, restart on failure (5 retries).",
 ["deploy", "railway", "github"], "railway.json", "current"),
("deploy-cli-fallback", "Operations", "Fallback deploy: railway up with the project token",
 "When a push is blocked: from the repo root run env -u RAILWAY_API_TOKEN RAILWAY_TOKEN=$RAILWAY_TOKEN_RELAY_SITE railway up --service relay-site --detach (token in ITCAN-Hub/deploy/.env). The service's /relay root directory applies to the upload. Then push the same commit so the repo and the live site match; otherwise the next push rolls the site back.",
 ["deploy", "railway", "cli"], "relay/docs/TRD.md", "current"),
("preview-local", "Operations", "Local preview",
 "cd relay/web && npm install && npm run build, then from relay/: PORT=4173 npm start and open http://localhost:4173 (add ?nogl to skip WebGL). Check phones at 390x844 and desktop at 1440x900, in both themes.",
 ["preview", "testing"], "relay/docs/PROJECT.md", "current"),
("verify-after-deploy", "Operations", "Checks after every deploy",
 "/healthz returns 200; the served css/site.css?v= stamp matches the build; a phone screenshot pass shows no horizontal scroll (scrollWidth equals innerWidth), the dock and menu work, and the theme toggles.",
 ["deploy", "testing", "qa"], "relay/docs/TRD.md", "current"),
("sync-working-copy", "Operations", "Working copy vs the git clone",
 "MK edits in ~/Documents/Claude/Projects/itcan-website, which mirrors relay/ in the git clone ~/Documents/itcan-site. Before copying files across: git pull --ff-only in the clone and diff relay/ against the working copy so newer remote work is never overwritten (the clone was once 40 commits behind).",
 ["workflow", "git"], "session 1 Oct 2026", "current"),

# ---------------------------------------------------------------- Product
("audiences-goals", "Product", "Audiences and goals",
 "Audiences: enterprise buyers in SG, MY, AU, HK, IN, ID (send a brief); hiring managers needing contract talent (build a team); candidates (send CV to jobs@itcan.biz); press and partners (media@itcan.biz). Goals: enquiries per 1,000 visits (+25% after a baseline month), proof within two scrolls of the hero, mobile Lighthouse accessibility >= 95, LCP < 2.5s on 4G, all old WordPress URLs 301 to the right section.",
 ["product", "goals", "audiences"], "relay/docs/PRD.md", "current"),
("content-facts", "Product", "Company facts used on the site",
 "960 projects, 1,200+ employees, 480 clients, 6 offices (Singapore HQ at 30 Cecil Street, Prudential Tower #18-08; Kuala Lumpur; Sydney; Hong Kong; New Delhi; Jakarta), 28 awards 2007-2023 including ten Enterprise 50 wins, nine practices, ten sectors (confirmed by ITCAN Oct 2026). UEN 200413557M, MOM EA Licence 13C6429. Inboxes: info, sales, hr, jobs, media @itcan.biz; phone +65 6604 6805.",
 ["content", "facts"], "README.md content map", "current"),
("mobile-requirements", "Product", "Mobile requirements M-01 to M-11",
 "No horizontal scroll from 360px; headings never touch; opaque header; phone header is logo only with Talk to us and menu in a bottom dock; 44px tap targets; section heads aligned with content; no text overlap at rest; 16px body and inputs; primary actions in thumb reach; phones get the same content and motion as desktop; cards on 20px margins. All met as of 1 Oct 2026 except award heat-map cells (26px).",
 ["mobile", "requirements"], "relay/docs/PRD.md", "current"),

# ---------------------------------------------------------------- UI changes
("mobile-pass-2026-10-01", "ui", "Mobile UX pass, 1 Oct 2026 (commit 1f49685)",
 "Heading tracking in em; phone titles 24 to 30px; header plate 90% opaque with blur; theme toggle moved into the menu; menu tiles numbered 01-11 instead of PR/SV codes; section heads left-aligned on phones; time-zone caption moved below the lanes; Open in maps never wraps; 44px tap targets; footer social text replaced by icons; statement title kept at its fitted phone size.",
 ["mobile", "ui"], "commit 1f49685", "current"),
("bottom-dock-2026-10-01", "ui", "Phone bottom dock and upward menu (commit dc28452)",
 "MK 1 Oct 2026: menu at the bottom. On phones .nav-actions is a floating pill fixed above the safe area (--dock-h 3.75rem) with Talk to us and the menu button; body gets matching bottom padding. The menu opens upward as a two-column sheet (descriptions hidden) with the Light theme row. The header shows only the logo. Desktop unchanged.",
 ["mobile", "navigation", "ui"], "commit dc28452", "current"),
("sectors-phone-spread-2026-10-01", "ui", "Sectors stack-to-spread animation on phones (commit dc28452)",
 "MK 1 Oct 2026: the 10 sectors did not animate on mobile. sectors.js now runs the spread when (max-width: 580px) and (min-height: 600px) using the LP layout: 3+2 cards above the heading and 2+3 below. The band excludes the dock height (--ss-bot). Heading centred, subtitle hidden in spread mode, names 12px with hyphenation (Telecom&shy;munications). Tablets 581-1000px keep the static grid.",
 ["mobile", "animation", "sectors"], "commit dc28452", "superseded"),
("sectors-mobile-grid-2026-10-02", "ui", "Sectors on phones and tablets: two- and three-column image grid",
 "MK 2 Oct 2026 brief: replace the overlapping cards and long scroll animation on mobile with a clean image grid (direction: CodeOS/relay-mobile-design). Up to 580px two columns, 581-1000px three, 4:5 photos with a dark fade, a 01-10 index from a CSS counter and the sector name (16px phones, 18px tablets). The desktop stack-to-spread (over 1000px wide and 600px tall) is unchanged; reduced motion always gets the grid.",
 ["mobile", "tablet", "sectors"], "web/css/sectors.css", "current"),
("touch-targets-px-2026-10-02", "Rules", "Touch targets are set in px on phones, not rem",
 "The phone root font scales down to 14.67px, so 2.75rem is only 40px at 320. Controls up to 1000px wide use min-width/min-height 44px; inline list links (inboxes, footer columns, office phone/email) get padding 13px 0 with matching negative margin so the hit area is 44px without moving the text.",
 ["mobile", "accessibility", "touch"], "web/css/mobile.css", "current"),
("statement-trigger-2026-10-01", "ui", "Statement text starts at 80% iris open",
 "The statement plate's words used to wait until the iris was fully open, leaving an empty red card for about a second. wrap.dataset.open now flips at openEnd - 0.2 * OPEN * k (transitions.js). 0.45 was tried and showed words clipped by the iris. The clipped headline and the flying i mark mid-scroll are intended choreography, not bugs.",
 ["animation", "statement"], "commit dc28452", "current"),
("awards-chart-phones-2026-10-01", "ui", "Awards over time chart restored on phones",
 "The wg-curves tile was display:none at 580px and below. It is back as a fifth tile (grid area c) with the curves and legend repositioned. Award filter chips are left-aligned on phones.",
 ["mobile", "awards"], "commit dc28452", "current"),

("phone-design-pass-2026-10-02", "ui", "Phone design pass: swipe rows, fewer labels, shorter page",
 "MK 2 Oct 2026: mobile layout still needed proper design. Reviewed with ui-ux-pro-max and taste-skill. On phones (580px and below) the offices grid, the engage plans and the proof number/quote columns are horizontal scroll-snap rows (cards 86% wide, next card peeking, scrollbar hidden). Section badges hidden except the hero chip and sectors; services row numbers and Step N prefixes hidden; en-dashes replaced with hyphens; office coordinates hidden in the swipe cards. Page went from 30.4 to about 25 screens. Desktop unchanged.",
 ["mobile", "ui", "carousel"], "web/css/mobile.css", "current"),

# ---------------------------------------------------------------- Security
("security-headers", "Security", "Security headers on every response",
 "CSP (self scripts, YouTube frames, itcan.biz and ytimg images, form-action self and mailto, frame-ancestors self), HSTS 1 year with includeSubDomains, X-Frame-Options SAMEORIGIN, nosniff, strict-origin-when-cross-origin referrer, Permissions-Policy camera/mic/geolocation off, COOP same-origin. Since 1 Oct 2026 also on /healthz, the award 302 and 500 responses. Path check requires ROOT + path.sep.",
 ["security", "headers", "csp"], "relay/docs/SECURITY.md", "current"),
("deploy-credentials-risk", "Security", "Deploy tokens stored in plain text",
 "ITCAN-Hub/deploy/.env holds a Railway workspace token (reaches every itcanbiz project) and the relay-site project token. Keep the file out of repos and backup sync; prefer the project token; rotate both if the machine is shared or lost.",
 ["security", "secrets", "railway"], "relay/docs/SECURITY.md", "current"),

# ---------------------------------------------------------------- Open items
("open-git-push-403", "Open items", "git push to itcan-site returns 403",
 "Since 1 Oct 2026 the local GitHub credentials cannot push to manishkrsg-cloud/itcan-site. Three commits (1f49685 mobile pass, 9560f93 docs, dc28452 dock and sectors) were deployed by CLI upload and exist only in ~/Documents/itcan-site. Fix access, then git push. P1: any other push rolls the live site back.",
 ["deploy", "github", "blocker"], "ISSUES.md ISS-01", "open"),
("open-desktop-nav", "Open items", "Desktop nav is crowded",
 "10 links plus a status pill and two buttons. Proposed: fold Numbers into Awards and Teams into Contact, or move them to the footer.",
 ["navigation", "desktop"], "ISSUES.md ISS-06", "open"),
("open-award-cells", "Open items", "Award heat-map cells are 26px on phones",
 "Below the 44px tap target. Make them non-interactive on phones or enlarge the hit area.",
 ["mobile", "awards", "accessibility"], "ISSUES.md ISS-07", "open"),
("open-small-labels", "Open items", "Some labels are 11px",
 ".pr-name on phones and small mono captions. Raise to a 12px floor.",
 ["typography"], "ISSUES.md ISS-08", "open"),
("open-visual-polish", "Open items", "Gradient heading fill and pure black background",
 "Flagged by the taste review: use a solid heading colour and an off-black ground such as #05060a instead of #000.",
 ["visual", "polish"], "ISSUES.md ISS-09", "open"),
("open-no-tests", "Open items", "No automated checks",
 "Add a Playwright smoke test (no horizontal scroll, menu, theme, no overlap at key anchors) and Lighthouse CI on mobile.",
 ["testing"], "ISSUES.md ISS-10", "open"),
("open-privacy-review", "Open items", "Privacy policy not yet reviewed by ITCAN",
 "The PDPA notice at /privacy-policy/ is new text. ITCAN must approve it before the itcan.biz cut-over.",
 ["privacy", "pdpa", "content"], "ISSUES.md ISS-11", "open"),
("open-domain-cutover", "Open items", "Move from the Railway URL to itcan.biz",
 "Release criteria: all P1 issues closed, privacy policy approved, Lighthouse mobile performance >= 80 and accessibility >= 95, redirects checked against the live WordPress sitemap. Then DNS, and consider HSTS preload.",
 ["launch", "dns"], "PRD.md section 8", "open"),

# ---------------------------------------------------------------- History
("history-relay-redesign", "History", "Relay redesign replaces WordPress itcan.biz",
 "The site was rebuilt on the Relay template's motion system with ITCAN content from itcan.biz (home, services, about, careers, contact). Old WordPress paths (/services, /about-us, /contact-us, /career, /press, /our-offices and others) redirect 301 to section anchors to keep search ranking.",
 ["history", "redesign", "seo"], "README.md", "current"),
("history-design-audit-2026-10-01", "History", "Design audit, 1 Oct 2026",
 "Audit with ui-ux-pro-max and taste-skill at 1440px and 390px in both themes. Found: phone headings running together, see-through header, crowded phone header, two-letter menu icons, centred heads over left-aligned cards, a time-zone caption overlap, wrapping maps buttons, small tap targets, text social links, empty statement plate, low-contrast service steps, no sector animation on phones, a hidden awards chart. All fixed and deployed the same day except the open items.",
 ["history", "audit", "design"], "relay/docs/ISSUES.md", "current"),
]

def q(s):
    return "$kb$" + s + "$kb$"

print("-- Generated by entries.py. Idempotent: re-running updates entries by slug.")
print("insert into public.kb_entries (slug, topic, title, body, tags, source, status) values")
rows = []
for slug, topic, title, body, tags, source, status in E:
    t = "array[" + ", ".join("'" + x + "'" for x in tags) + "]::text[]"
    rows.append(f"  ({q(slug)}, {q(topic)}, {q(title)}, {q(body)}, {t}, {q(source)}, {q(status)})")
print(",\n".join(rows))
print("on conflict (slug) do update set topic = excluded.topic, title = excluded.title, body = excluded.body,")
print("  tags = excluded.tags, source = excluded.source, status = excluded.status;")
