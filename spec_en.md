# Taipei Designated Smoking Areas PWA — Technical Spec

## 1. Project Overview

**Project name**: Taipei Smoking Areas Map (working title — feel free to rename)

**Goal**: A frontend-only, backend-free, database-free Progressive Web App (PWA) that lets a user open a web page, get auto-located, and quickly find the nearest legal designated smoking area — similar to the "search nearby restaurants" experience on Google Maps.

**Nature**: Non-profit, free, open source. This will **not** ship to the App Store. It will be deployed as a PWA on a free static hosting platform (GitHub Pages / Netlify / Vercel), and iOS users can "Add to Home Screen" in Safari to get a near-native app experience.

**Target users**: General public and visitors in Taipei who need to find a legal smoking area.

**Explicit non-goals**:
- No user accounts, login, or personalization beyond optional client-side `localStorage` (e.g. favorites) as a future iteration
- No backend API, no database
- No push notifications (iOS PWAs don't support background push anyway)
- No payments, no ads

---

## 2. Data Source

Two equivalent official data files are available from Taipei City Government open data:

- `臺北市指定吸菸區.csv` — UTF-8 with BOM, 274 rows
- `5b8996b557ee9d04cfc42427afb3228b_export.json` — same 274 records, already in JSON array form (one object per record, all field values as strings, including latitude/longitude)

**Use the JSON export as the primary source** (it avoids CSV parsing edge cases like BOM/quoting) — treat the CSV as a fallback/reference only.

Fields (Chinese key → meaning):
- `行政區` → district
- `地點` → name / site name
- `地址` → address
- `樣態` → type (one of: `戶外開放式吸菸區` outdoor open-air, `戶外負壓式吸菸區` outdoor negative-pressure, `室內吸菸室` indoor smoking room)
- `開放時間` → hours (free-text, not standardized — see note below)
- `緯度` → latitude (string in source, must be cast to number)
- `經度` → longitude (string in source, must be cast to number)
- `相對位置` → relative position / landmark description
- `照片連結` → photo URL (empty for ~41 of 274 records — must handle gracefully)
- `管理單位` → managing organization
- `管理單位電話` → managing organization phone number
- `備註` → note (typically the standard disclaimer: "This location information is for reference only; actual conditions are subject to on-site notices and signage.")

**Important**: `開放時間` (hours) is free-text and inconsistently formatted (e.g. `24小時開放` [open 24h], `週一至週五07:00-19:00，例假日及國定假日不開放` [weekdays only], `06:00-23:00`). Do **not** attempt full automatic parsing into "currently open" status for the MVP — the format is too irregular and error-prone. Just display the hours text as-is. A structured "currently open" badge is a Phase 2 stretch goal that requires manually normalizing this field first, and must not block MVP delivery.

### Data preprocessing tasks
1. Transform the JSON export into `public/data/smoking-areas.json`, translating keys to English (see schema below) and casting `lat`/`lng` to `number`.
2. Add a stable, unique `id` per record (e.g. slug of district + name, or array index).
3. Add a top-level `lastUpdated` field (date of conversion, `YYYY-MM-DD`) and a `source` field.
4. Handle empty `照片連結` (photoUrl) as `null`, not an empty string, so the UI can branch cleanly.

```json
{
  "lastUpdated": "2026-08-08",
  "source": "Taipei City Government Open Data",
  "areas": [
    {
      "id": "songshan-01",
      "district": "松山區",
      "name": "臺北體育館",
      "address": "南京東路4段10號",
      "type": "戶外開放式吸菸區",
      "hours": "24小時開放",
      "lat": 25.050778,
      "lng": 121.552194,
      "relativePosition": "體育館後方",
      "photoUrl": "https://lh3.googleusercontent.com/d/1Sf91EmEU2O5aOgNXIXhVg5Xfit5gGsQP",
      "managedBy": "臺北市政府體育局",
      "managedByPhone": "(02)25702330",
      "note": "本位置資訊僅供參考，實際情形以現場公告及標示為準"
    }
  ]
}
```

Note: keep the Chinese-language content (names, addresses, notes) as-is in the data — only the JSON *keys* and this spec are in English. The UI's primary language is Traditional Chinese; English UI is a Phase 2 stretch goal (see §5.2).

---

## 3. Tech Stack

| Concern | Choice | Rationale |
|---|---|---|
| Map library | [Leaflet.js](https://leafletjs.com/) | Free, open source, no API key required |
| Base tiles | OpenStreetMap | Free, no usage cap |
| Marker clustering | [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster) | Mature, handles cluster/expand on zoom |
| Frontend framework | Vanilla HTML/CSS/JS, or lightweight build tooling via Vite | Minimal dependencies, easy for open-source contributors |
| Geolocation | Native browser `Geolocation API` | No dependency needed |
| PWA | `manifest.json` + Service Worker (native API or Workbox) | Offline caching, "Add to Home Screen" support |
| Deployment | GitHub Pages / Netlify | Free, automatic HTTPS (required by both Geolocation and Service Worker) |
| Geocoding (optional) | [Nominatim](https://nominatim.org/) (OpenStreetMap's free geocoder) | Powers an address search box that pans the map |

---

## 4. Core User Flow (MVP)

1. User opens the page → browser prompts for location permission.
2. **Permission granted**: map centers on the user's location (suggested zoom level 15), showing a "you are here" marker.
3. **Permission denied/unavailable**: map falls back to showing all of Taipei (e.g. centered on City Hall coordinates), with a visible message like "Allow location access to see areas near you." All map/list features remain usable without location.
4. All smoking-area markers render on the map, using marker clustering:
   - Zoom in → individual site markers expand.
   - Zoom out → nearby sites collapse into a numbered cluster circle; tapping it zooms/expands automatically.
5. Tapping a single marker → popup card with: site name, address, hours, type.
6. Tapping "View details" in the popup → detail view/modal with full info: address, relative-position description, hours, managing organization, managing organization phone (`tel:` link), photo (if available), the disclaimer note, and a "Navigate" button that opens Apple Maps or Google Maps (via `maps://`, `geo:`, or `https://maps.apple.com/?daddr=` URL schemes).

---

## 5. Feature Requirements

### 5.1 MVP (must-have, Phase 1)
- [ ] Map view with all 274 site markers
- [ ] Marker clustering (auto merge/expand on zoom)
- [ ] User geolocation + auto map centering + graceful denial fallback
- [ ] Tap marker → info popup
- [ ] Detail view with full site info (tap-to-call phone, navigate button)
- [ ] Filter by district (行政區)
- [ ] Filter by type (樣態: outdoor open-air / outdoor negative-pressure / indoor)
- [ ] Graceful fallback UI for missing/broken photos (no photo URL, or Google Photos link fails to load)
- [ ] Disclaimer section or page (mirrors the source data's standard note: "for reference only; actual conditions are subject to on-site notices and signage")
- [ ] Basic PWA setup: `manifest.json`, Service Worker caching static assets and the data JSON, iOS-specific meta tags (`apple-touch-icon`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`)
- [ ] HTTPS deployment (GitHub Pages / Netlify provide this by default)
- [ ] Responsive design, mobile-portrait-first

**Decided against**: a standalone "nearest to me" list view (sorted by Haversine distance, toggleable with the map). Auto-geolocation + map centering + marker clustering already surfaces nearby sites well enough on their own (zooming in/out naturally narrows/widens what's shown), so a separate sorted-list UI would be redundant. Not planned for Phase 2 either. Also decided against a "Search this area" button: it exists on apps like Google Maps to resync a fetched/limited results list against the viewport, but this app renders all markers locally and clustering already re-groups live as the map is panned/zoomed — there's no stale results state for it to fix.

### 5.2 Phase 2 (nice-to-have, must not block MVP launch)
- [ ] Search box (address/landmark input, geocoded via Nominatim, pans the map)
- [ ] English/Chinese language toggle
- [ ] "Currently open" badge (requires normalizing the free-text hours field first)
- [ ] User-facing "report an issue with this listing" form (e.g. a Google Form embed, since there's no backend)
- [ ] `localStorage`-based favorites / recently used filters

---

## 6. iOS Safari / PWA Gotchas

1. Service Worker caching on iOS Safari is less reliable than desktop browsers — **if the user hasn't opened the app in roughly a week, iOS may evict the cache and localStorage.** Design the app so that on every open it tries to fetch fresh data over the network first, falling back to cache only when offline — never assume the cache persists indefinitely.
2. iOS does not support PWA background push — don't design any UI around it.
3. Set `manifest.json`'s `display` to `standalone`, and provide multiple icon sizes (at least 180×180 for `apple-touch-icon`).
4. Both the Geolocation API and Service Worker registration require `https://` (or `localhost` for local dev) — confirm the hosting platform serves HTTPS automatically in production (GitHub Pages and Netlify both do).

---

## 7. Suggested Project Structure

```
/
├── index.html
├── manifest.json
├── service-worker.js
├── src/
│   ├── main.js              # Entry point, orchestrates map + flow
│   ├── map.js                 # Leaflet init, marker clustering
│   ├── geolocation.js         # Geolocation logic + fallback
│   ├── filters.js             # District/type filtering logic
│   ├── ui/
│   │   ├── popup.js
│   │   └── detailView.js
│   └── styles/
│       └── main.css
├── public/
│   ├── data/
│   │   └── smoking-areas.json
│   └── icons/                 # PWA icons, multiple sizes
├── scripts/
│   └── convert-data.js        # One-time raw-export → app JSON conversion script (Node or Python)
└── README.md
```

---

## 8. Definition of Done (MVP)

1. Opening the URL on a real iPhone in Safari successfully geolocates, centers the map near the user, and shows nearby markers.
2. Denying location permission does not crash or blank-screen the app — it falls back to showing all sites normally.
3. Zooming clusters/expands markers correctly; 274 points render smoothly with no jank on a mid-tier iPhone.
4. Tapping any marker shows the correct, matching full info for that site — no data mismatch.
5. Filtering by district/type updates the map in place, without a full page reload.
6. "Add to Home Screen" launches a standalone, full-screen experience (no Safari address bar).
7. Reopening offline still shows at least the last-cached map and data (not a blank page).
8. The disclaimer text is clearly visible, and data source + last-updated date are shown.

---

## 9. Source Data Files

- `5b8996b557ee9d04cfc42427afb3228b_export.json` (primary source, 274 records, JSON array)
- `臺北市指定吸菸區.csv` (fallback/reference, same 274 records, UTF-8 with BOM)

Both files ship alongside this spec. The first implementation step should be running the conversion script (§2, §7) against the JSON export to produce `public/data/smoking-areas.json`.
