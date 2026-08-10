# Taipei Smoking Areas Map

## Project Overview

A frontend-only, backend-free, database-free Progressive Web App (PWA) that
auto-locates the user and helps them find the nearest legal designated
smoking area in Taipei — like "search nearby restaurants" on Google Maps.

- **Nature**: Non-profit, free, open source. Not an App Store app — deployed
  as a PWA on free static hosting (GitHub Pages / Netlify / Vercel). iOS
  users add it to their Home Screen via Safari for a near-native feel.
- **Target users**: General public and visitors in Taipei looking for a
  legal smoking area.
- **Explicit non-goals**: no user accounts/login (beyond optional
  `localStorage` favorites, Phase 2), no backend API, no database, no push
  notifications, no payments, no ads.

Full details: `spec_en.md`.

**Live deployment**: https://kunandkarina.github.io/taipei-smoking-map/
(GitHub Pages, deployed from `main` branch root, no custom domain).
Verified in-browser against the real production origin: service worker
registers/activates with scope correctly resolved to the `/taipei-
smoking-map/` subpath, manifest loads with all 4 icon entries, all 274
markers render, and the app shell + data JSON are both cached for
offline use — all paths in the project are relative, so nothing needed
adjusting for the subpath deployment.

## Tech Stack

| Concern | Choice |
|---|---|
| Map library | Leaflet.js |
| Base tiles | OpenStreetMap |
| Marker clustering | Leaflet.markercluster |
| Frontend | Vanilla HTML/CSS/JS, or Vite for lightweight build tooling |
| Geolocation | Native browser Geolocation API |
| PWA | `manifest.json` + Service Worker (native or Workbox) |
| Deployment | GitHub Pages / Netlify (free HTTPS) |
| Geocoding (optional, Phase 2) | Nominatim |

No API keys required anywhere in this stack.

## Data

Two equivalent official Taipei City Government open-data files ship in
`data/`, both with the same 274 records:

- `data/5b8996b557ee9d04cfc42427afb3228b_export.json` — **primary source**.
  JSON array, one object per record, all values as strings (including
  lat/lng).
- `data/臺北市指定吸菸區.csv` — fallback/reference only. UTF-8 with BOM.

Source fields (Chinese key → meaning): `行政區` district, `地點` site name,
`地址` address, `樣態` type (`戶外開放式吸菸區` outdoor open-air /
`戶外負壓式吸菸區` outdoor negative-pressure / `室內吸菸室` indoor), `開放時間`
hours (irregular free text — do **not** attempt to parse into an "open now"
status for MVP, just display as-is), `緯度`/`經度` lat/lng (strings, cast to
number), `相對位置` relative position/landmark, `照片連結` photo URL (empty
for ~41/274 records — must convert to `null`, not `""`), `管理單位` managing
org, `管理單位電話` managing org phone, `備註` note (standard disclaimer).

A one-time conversion script (`scripts/convert-data.js`)
transforms the JSON export into `public/data/smoking-areas.json`:
translate keys to English, cast lat/lng to numbers, add a stable unique
`id` per record, add top-level `lastUpdated` (`YYYY-MM-DD`) and `source`
fields. Target schema and example record are in `spec_en.md` §2. Chinese
content (names, addresses, notes) stays in Chinese in the data — only keys
are English. UI's primary language is Traditional Chinese (English UI is a
Phase 2 stretch goal).


## Suggested Project Structure

```
/
├── index.html
├── manifest.json
├── service-worker.js
├── src/
│   ├── main.js              # Entry point, orchestrates map + flow
│   ├── map.js                # Leaflet init, marker clustering
│   ├── geolocation.js        # Geolocation logic + fallback
│   ├── filters.js            # District/type filtering logic
│   ├── ui/
│   │   ├── popup.js
│   │   └── detailView.js
│   └── styles/
│       └── main.css
├── public/
│   ├── data/
│   │   └── smoking-areas.json
│   └── icons/                # PWA icons, multiple sizes
├── scripts/
│   └── convert-data.js       # One-time raw-export → app JSON conversion
└── README.md
```

Current state vs. this structure: `scripts/convert-data.js`,
`public/data/smoking-areas.json`, `index.html`, `manifest.json`,
`service-worker.js`, `src/map.js`, `src/main.js`, `src/geolocation.js`,
`src/filters.js`, `src/ui/detailView.js`, `src/ui/filterBar.js`,
`src/styles/main.css`, and `public/icons/` (5 PNG sizes: 512/192
maskable+any for the manifest, 180 for `apple-touch-icon`, 32/16 for the
browser favicon — generated from one master SVG via `sips`, a teal badge
with a white circle + cigarette pictogram echoing Taiwan's designated-
smoking-area signage) all exist. Not yet built: `src/ui/popup.js`. There
is no separate `popup.js` — tapping a marker opens `detailView.js`'s bottom
sheet directly (Google Maps pin-tap behavior), so the old intermediate
popup was removed rather than growing into its own module. `filters.js`
is a small pub/sub store (selected districts + types, `applyFilters()`,
`subscribeToFilters()`) rather than pure stateless logic — kept there
instead of a new module since the whole point is to be one shared source
of truth that the map reads from. No `listView.js` is planned: we decided
against a standalone "nearest to me" list view since auto-geolocation +
map centering + clustering already covers that use case (see MVP
checklist).

## Core User Flow (MVP)

1. Open page → browser prompts for location permission.
2. **Granted**: map centers on user (zoom 15) with a "you are here" marker.
3. **Denied/unavailable**: map falls back to all of Taipei (e.g. City Hall
   coords) with a visible "allow location to see nearby areas" message; all
   features stay usable without location.
4. All markers render with clustering — zoom in expands individual sites,
   zoom out collapses into numbered clusters.
5. Tap a marker → the full detail view opens directly as a bottom sheet
   (no intermediate popup, matching Google Maps pin-tap behavior): name,
   type badge, address, relative position, hours, type, managing org,
   phone (`tel:` link or "not provided"), photo (or placeholder if
   missing/broken), disclaimer note, and a sticky "Navigate" button
   (routes to `maps.apple.com`/`geo:`/Google Maps directions depending on
   platform). Every field section always renders, even when its value is
   empty, to keep the card layout consistent across all 274 sites.

## MVP Feature Checklist (Phase 1, must-have)

- [x] Map with all 274 markers + clustering (`src/map.js`,
  Leaflet.markercluster, verified in-browser)
- [x] Geolocation + auto-centering + graceful denial fallback
  (`src/geolocation.js` distinguishes denied/timeout/unavailable/unsupported,
  all rendering the same city-wide fallback with a message + manual
  "enable location" retry button; "you are here" marker is a distinct
  divIcon dot kept outside the cluster group)
- [x] Marker tap → detail view (tap-to-call, navigate button)
  (`src/ui/detailView.js`; tap opens the full bottom sheet directly, no
  intermediate popup; verified in-browser incl. tel: link, Navigate URL,
  close via X/backdrop/Escape)
- [x] Filter by district (行政區) and type (樣態) (`src/filters.js` +
  `src/ui/filterBar.js`; district = multi-select checkbox dropdown, type =
  multi-select toggle pills color-coded to match the detail view's type
  badges; empty selection in a category means "show all" for that
  category, categories AND together; map re-syncs via
  `subscribeToFilters()` — verified in-browser with exact count checks)

**Decided against**: a standalone "nearest to me" list view (Haversine-
sorted, top N, toggleable with the map). Auto-geolocation + map centering
+ clustering already surfaces nearby sites well enough on their own, so a
separate sorted-list UI would be redundant; `distance.js`/Haversine is
dropped from the plan accordingly. Not planned for Phase 2 either.
Also decided against a "Search this area" button: it solves staleness
for a fetched/limited results list, but this app renders all markers
locally and clustering already re-groups live as the map is panned/
zoomed, so there's no stale state for it to resync.

- [x] Graceful fallback for missing/broken photos (placeholder icon for
  `null` photoUrl, distinct "failed to load" placeholder on image error)
- [x] Disclaimer section (source data's standard reference-only note,
  shown per-site in the detail view; always renders even if a future
  record ships with an empty `note`)
- [x] Basic PWA setup: `manifest.json` (name/icons/`display: standalone`/
  theme color), `service-worker.js` (network-first fetch for same-origin
  requests, falling back to cache only on failure — precaches the app
  shell + `smoking-areas.json` + icons on install; cross-origin requests
  like OSM tiles/CDN scripts/fonts are left to the browser, not
  intercepted), iOS meta tags (`apple-touch-icon`,
  `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`,
  `apple-mobile-web-app-title`) plus a `theme-color` meta and standard
  favicon links. Verified in-browser: service worker registers and
  activates, manifest fetches with 4 icon entries, and — after killing
  the local dev server outright (not just DevTools offline mode) — a
  reload still rendered the full map with all 274 markers from cache, no
  blank page.
- [x] HTTPS deployment (GitHub Pages, https://kunandkarina.github.io/
  taipei-smoking-map/ — see "Live deployment" note above)
- [x] Mobile-portrait-first responsive design. Fixed a real overlap bug
  found during testing: Leaflet's zoom control defaults to a fixed
  top-left position, which sat underneath the floating top bar
  (location banner + filter bar) once the bar wrapped to two rows on
  narrow screens — completely hidden, not just visually crowded. Fixed
  with a `ResizeObserver` on `#top-stack` (`src/main.js`) that keeps a
  `--map-controls-offset` CSS var in sync with the bar's real (variable)
  height, and `.leaflet-top { margin-top: var(--map-controls-offset) }`
  in `main.css` — adapts live whether the bar is one row or two, banner
  shown or hidden. Also added: `viewport-fit=cover` on the viewport meta
  plus `env(safe-area-inset-*)` padding on the top bar and detail sheet
  (top bar previously only handled the bottom inset on the detail sheet
  footer; notch/home-indicator/rounded-corner areas on the sides and top
  were unhandled), and larger touch targets under 480px width (checkbox
  rows, filter pills, detail-sheet close button) via a `max-width: 480px`
  media query. Verified in-browser at 320px and 375px widths using a
  same-origin iframe harness (this environment's window resize is
  clamped to a 500px minimum, so real narrow viewports aren't reachable
  by resizing the browser window directly) — confirmed no horizontal
  overflow, zoom control fully visible below the bar in both one-row and
  two-row (banner + filter bar) states, and the detail sheet/dropdown
  panel both render correctly at these widths. Desktop width re-checked
  for regressions afterward — none.

**Phase 2 (nice-to-have, must not block MVP)**: Nominatim search box,
EN/中文 language toggle, "currently open" badge (needs hours normalization
first), "report an issue" form (e.g. Google Form embed), `localStorage`
favorites/filters.

## iOS Safari / PWA Gotchas

- Service Worker caching is unreliable on iOS — if unopened for ~a week,
  iOS may evict cache/localStorage. Always try network-first fetch for
  fresh data, falling back to cache only when offline.
- No PWA background push support on iOS — don't design around it.
- `manifest.json` `display: standalone`; provide icons ≥180×180 for
  `apple-touch-icon`.
- Geolocation API and Service Worker registration both require `https://`
  (or `localhost` in dev).

## Definition of Done (MVP)

1. On a real iPhone in Safari: geolocates, centers map near user, shows
   nearby markers.
2. Denying location doesn't crash/blank-screen — falls back to all sites.
3. Clustering expands/collapses correctly; 274 points render with no jank
   on a mid-tier iPhone.
4. Marker tap shows correct, matching full info — no data mismatch.
5. District/type filters update the map in place, no full reload.
6. "Add to Home Screen" launches standalone, no Safari address bar.
7. Reopening offline still shows last-cached map and data, not a blank
   page.
8. Disclaimer, data source, and last-updated date are all visible.
