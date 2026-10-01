# Issues and backlog: ITCAN website

Updated 1 Oct 2026, after the design audit (desktop 1440px, phone 390px, both themes) and the mobile UX pass.

Priority: **P1** blocks the itcan.biz cut-over · **P2** visible quality problem · **P3** polish.

## Open

| ID | P | Area | Issue | Proposed fix |
|---|---|---|---|---|
| ISS-01 | P1 | Deploy | `git push` to `manishkrsg-cloud/itcan-site` returns 403 for the local credentials. The 1 Oct mobile pass was deployed by CLI upload and is committed locally only. | Restore write access for the deploy account, then push commit "Mobile UX pass…" from `~/Documents/itcan-site`. |
| ISS-02 | P2 | Statement plate | Partway through the scroll animation the headline is clipped at the plate edge, and the "i" mark can sit over the Offices heading. On phones the plate shows as a large empty red block before its text fades in. | In `src/sections` (statement), keep the title visible for the whole iris animation and fade the mark out when the section leaves; start the phone text fade earlier. |
| ISS-03 | P2 | Sectors | On desktop the "One way of working" heading sits beneath the tilted photo stack until the stack fans out. | Raise the heading above the stack (z-index) or delay the heading until the fan-out finishes. |
| ISS-04 | P2 | Services | Steps 3–4 in the worked-example cards are dimmed below 4.5:1 contrast. | Raise the inactive-step opacity so the text passes AA; keep the "done" emphasis with the icon and colour. |
| ISS-05 | P2 | Security | Path check in `server.js` uses `startsWith(ROOT)` without a trailing separator (see SECURITY.md, SEC-01). | `startsWith(ROOT + path.sep)`. |
| ISS-06 | P2 | Nav (desktop) | 10 links, a status pill and two buttons in one bar. | Fold "Numbers" into Awards and "Teams" into Contact, or move them to the footer. |
| ISS-07 | P3 | Awards | Award heat-map cells are 26px tall on phones (below the 44px tap target). | Make cells non-interactive on phones, or enlarge the hit area. |
| ISS-08 | P3 | Type | Some labels are 11px (`.pr-name` on phones, small mono captions). | 12px floor. |
| ISS-09 | P3 | Visual | Headline gradient text fill and a pure-black `#000` background (flagged by the taste review). | Solid heading colour; off-black ground such as `#05060a`. |
| ISS-10 | P3 | Testing | No automated checks. | Playwright smoke test (no horizontal scroll, menu, theme, no overlap at key anchors) and Lighthouse CI. |
| ISS-11 | P3 | Content | Privacy policy is new text that ITCAN has not reviewed. | ITCAN review before cut-over (also a P1 release criterion in PRD.md). |

## Closed (1 Oct 2026, mobile UX pass)

| ID | Issue | Fix |
|---|---|---|
| M-FIX-01 | Phone headings ran words together ("Technologyopensthedoor") because of a fixed −2px letter spacing. | Letter spacing in `em`, eased on smaller screens; phone titles 24 → 30px. |
| M-FIX-02 | Content showed through the phone header (70% opaque plate). | 90% plate with an 18px blur and a hairline border. |
| M-FIX-03 | Crowded phone header (theme, CTA, menu). | Theme toggle moved into the menu card. |
| M-FIX-04 | Menu used two-letter codes (PR, SV, SE…) as icons. | Numbered tiles 01–11. |
| M-FIX-05 | Centred section heads over left-aligned cards. | Section heads left-aligned on phones. |
| M-FIX-06 | Time-zone caption overlapped the New Delhi lane. | Caption moved below the four lanes. |
| M-FIX-07 | "Open in maps" wrapped onto two lines in some cards. | No wrap; coordinates truncate instead. |
| M-FIX-08 | Tap targets of 18–38px on chips, maps buttons, footer and contact links. | 44px minimum. |
| M-FIX-09 | Footer social links were text ("in", "yt", "@", "tel"). | LinkedIn, YouTube, email and phone icons. |
| M-FIX-10 | Statement title overflowed the phone plate after the type-size change; caption clipped. | Statement title keeps its fitted size; caption hidden on phones. |
