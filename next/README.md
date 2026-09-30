# ITCAN flagship site ("Points of light")

A fresh concept for itcan.biz, built as a comparison to the Relay-style site in `/relay`.

The idea: ITCAN is 1,200+ people, so the opening is 1,200 points of light, one per person.
As you scroll they re-form into the ITCAN wordmark, a globe of the six offices, the people
themselves, the number 28 (awards), and the four services.

## Sections
Story (points of light) · Two doors (hire / job) · Services · Numbers · How we fill a role ·
Team Builder (brief to sales@itcan.biz by email) · Trophy hall (28 awards) · Offices (globe,
live clocks) · Careers · Who we are · Media · Contact and footer (staff login).

## Run locally
```
cd web && npm install && npm run build   # builds into ../public
cd .. && npm run dev                     # fetches award photos, serves on :3000
```

## Deploy (Railway)
Service root directory `/next`. Build `npm run build` (fetches award photos), start `npm start`,
health check `/healthz`. Built front-end files in `public/` are committed.

## Content to confirm with ITCAN before launch
- "How we fill a role" steps, including "a delivery lead signs off every profile we send you".
- Team Builder role list and family groupings.
- Numbers (1,200+, 960 projects, 480 clients, 28 awards) are carried over from the current site.
