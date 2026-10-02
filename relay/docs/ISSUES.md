# Issues and backlog: ITCAN website

Updated 1 Oct 2026, after the design audit (desktop 1440px, phone 390px, both themes), the mobile UX pass and the second mobile pass (bottom dock, sectors animation).

Priority: **P1** blocks the itcan.biz cut-over · **P2** visible quality problem · **P3** polish.

## Open

| ID | P | Area | Issue | Proposed fix |
|---|---|---|---|---|
| ISS-01 | P1 | Deploy | `git push` to `manishkrsg-cloud/itcan-site` returns 403 for the local credentials. The 1 Oct mobile pass was deployed by CLI upload and is committed locally only. | Restore write access for the deploy account, then push commit "Mobile UX pass…" from `~/Documents/itcan-site`. |
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

## Closed (1 Oct 2026, second pass)

| ID | Issue | Fix |
|---|---|---|
| ISS-02 | Statement plate showed an empty red card for about a second after the iris opened. The clipped headline and the flying "i" mid-scroll are intended choreography. | Text starts once the iris is 80% open (`transitions.js`). |
| ISS-03 | Sectors heading under the photo stack mid-scroll. | By design: the stack fans out to reveal the heading. No change. |
| ISS-04 | Upcoming Services steps at 38% opacity failed contrast. | 65% (`services.css`). |
| ISS-05 / SEC-01, SEC-02 | Server path check without a separator; health, 302 and 500 responses lacked security headers. | `startsWith(ROOT + path.sep)`; `SECURITY_HEADERS` on every response. |
| M-FIX-11 | Menu and "Talk to us" sat at the top of the phone screen, out of thumb reach. | Floating bottom dock on phones; the menu opens upward as a two-column sheet with the theme switch. |
| M-FIX-12 | The ten sectors were a static grid on phones. | Phone layout for the stack-to-spread animation: 3 + 2 cards above the heading and 2 + 3 below, clear of the dock. |
| M-FIX-13 | The hero card was inset 26px; every other card sits at 20px. | Phone card width is the page width minus the margins (`spectra.js`). |
| M-FIX-14 | The "Awards over time" chart was hidden on phones. | Restored as a fifth tile. |
| M-FIX-15 | Award filter chips were centred under left-aligned headings. | Left-aligned on phones. |

## Closed (2 Oct 2026, phone design pass)

| ID | Issue | Fix |
|---|---|---|
| M-FIX-16 | Phone page was about 30 screens long; offices (3,521px), plans and the number/quote cards were long stacks of like cards. | Offices, plans and number/quote cards are swipeable rows with the next card peeking (scroll-snap). Page is about 25 screens. |
| M-FIX-17 | 11 uppercase section labels on phones (taste rule: one per three sections). | Section labels hidden on phones; the hero chip and the sectors label stay. |
| M-FIX-18 | "01" row numbers and "Step 1" prefixes in Services. | Hidden on phones; step names carry the sequence. |
| M-FIX-19 | En-dashes in "1–3", "4–30", "2007–2023". | Plain hyphens. |
| M-FIX-20 | Office coordinates truncated in the swipe cards. | Hidden on phones; the maps button remains. |

## Ready for review (2 Oct 2026, mobile responsiveness pass, not deployed)

| ID | Change |
|---|---|
| M-FIX-21 | Sectors on phones and tablets: clean image grid (2 columns up to 580px, 3 columns 581-1000px) with index number and name on a dark fade, all ten sectors. Replaces the phone stack-to-spread animation (M-FIX-12). Desktop spread unchanged. |
| M-FIX-22 | `#services` now resolves (alias inside the Services section, whose id stays `#product`); `scroll-padding-top` lands direct links below the fixed header. |
| M-FIX-23 | Menu: focus moves to the first item on open, Escape closes and returns focus to the menu button, the closed menu is `inert`. |
| M-FIX-24 | Touch targets 44 x 44 CSS px on phones and tablets in px (rem shrank to 40px at 320 because the phone root font scales down). Covers menu, theme, hero card controls, CTAs, chips, filters, maps, inbox and footer links. |
| M-FIX-25 | Hero service cards on phones: 44px prev/next/pause, card copy at least 14px. Services step copy 14px. |
| M-FIX-26 | 320-360px: dock and menu gutters 8px; the services example summary is hidden where it collided with the kicker. |
| M-FIX-27 | Phone header per relay-mobile-design: logo and menu button at the top (menu drops down from the top again), one full-width "Talk to us" fixed at the bottom above the safe area, over a fade; body padding keeps the last content clear. Replaces the floating bottom dock (M-FIX-11). |
| M-FIX-28 | MK 2 Oct: "Talk to us" goes on top next to the menu. Phone header = logo, then Talk to us (44px) and the menu button on the right; nothing fixed to the bottom. Replaces M-FIX-27's bottom button. |
| M-FIX-29 | MK 2 Oct: "10 sector animation not working at mobile". The grid's rise-in fired for all ten cards when the top of the grid appeared, so rows 3-5 had finished before you reached them. Each card now rises in as it enters the viewport (12% in), staggered 90ms by column. Reduced motion: all visible at once. |
