# 臺北市指定吸菸區地圖 — Taipei Smoking Areas Map

A free, open-source Progressive Web App that auto-locates you and shows the
nearest legal designated smoking area in Taipei — like "search nearby
restaurants" on Google Maps, but for smoking areas.

**Live app**: https://kunandkarina.github.io/taipei-smoking-map/

## Why this exists

Taipei publishes an official open dataset of its 274 designated smoking
areas, but there's no easy way to browse it on a map or find the nearest
one while you're out. This project turns that raw government CSV/JSON into
a fast, installable, offline-capable map — with no account, no ads, no
backend, and no cost to run or maintain.

## Features

- **Auto-geolocation** — centers the map on you and shows nearby sites; if
  location is denied or unavailable, falls back to a city-wide view with a
  clear message and a manual "enable location" retry, no crash or blank
  screen.
- **274 markers with clustering** — all official designated smoking areas
  in Taipei, grouped into clusters that expand as you zoom in.
- **Tap a marker for full details** — name, address, relative
  landmark/position, hours, type, managing organization, tap-to-call phone
  number, photo (with graceful fallbacks for missing/broken images), and a
  one-tap "Navigate" button that opens Apple Maps / Google Maps / your
  platform's default maps app.
- **Filter by district and type** — multi-select filters for Taipei's 12
  districts (行政區) and the three site types (outdoor open-air, outdoor
  negative-pressure, indoor).
- **Installable PWA** — add it to your iPhone/Android home screen for a
  standalone, full-screen experience with no browser address bar.
- **Works offline** — the app shell and site data are cached, so it still
  loads (with the last-synced data) even with no connection.
- **Mobile-first, safe-area aware** — built and tested for one-handed use
  on narrow phone screens, including iPhone notch/home-indicator spacing.

## Tech stack

| Concern | Choice |
|---|---|
| Map | [Leaflet.js](https://leafletjs.com/) + [OpenStreetMap](https://www.openstreetmap.org/) tiles |
| Marker clustering | [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster) |
| Frontend | Vanilla HTML / CSS / JS ES modules — no framework, no build step |
| Geolocation | Native browser Geolocation API |
| Offline / installable | Web App Manifest + a hand-written Service Worker |
| Hosting | GitHub Pages (static, free HTTPS) |

No API keys, no backend server, and no database — everything runs entirely
in the browser from a static JSON file.

## Getting started locally

This is a static site with no build step, so any static file server works.

```bash
git clone https://github.com/kunandkarina/taipei-smoking-map.git
cd taipei-smoking-map
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser. (Geolocation and the
Service Worker both require a secure context — `localhost` counts, but a
plain `file://` URL will not work.)

## Project structure

```
/
├── index.html              # App shell + markup
├── manifest.json            # PWA manifest (icons, name, theme color)
├── service-worker.js        # Offline caching (network-first, cache fallback)
├── src/
│   ├── main.js               # Entry point — wires map, geolocation, filters together
│   ├── map.js                 # Leaflet map + marker/cluster setup
│   ├── geolocation.js          # Geolocation logic + error handling
│   ├── filters.js              # District/type filter state (pub/sub store)
│   ├── ui/
│   │   ├── detailView.js         # Bottom-sheet detail view for a tapped marker
│   │   └── filterBar.js           # Filter bar UI
│   └── styles/
│       └── main.css               # All app styling, mobile-first
├── public/
│   ├── data/smoking-areas.json  # Converted, app-ready dataset (274 records)
│   └── icons/                    # PWA icons (multiple sizes)
├── data/                    # Original government open-data exports (JSON + CSV)
├── scripts/
│   └── convert-data.js       # One-time script: raw government export → app JSON
└── spec_en.md               # Full product/technical spec
```

## Data source

Sourced from Taipei City Government open data (`data/` in this repo — both
a JSON export and a CSV are included as equivalent originals). A one-time
conversion script (`scripts/convert-data.js`) translates the raw Chinese
field names into an app-friendly English-keyed schema, casts latitude/
longitude to numbers, and normalizes missing photo URLs to `null`:

```bash
node scripts/convert-data.js
```

This regenerates `public/data/smoking-areas.json`, the file the app
actually fetches at runtime. Site names, addresses, and notes remain in
Traditional Chinese, matching the app's primary UI language.

**Note on hours**: opening-hours text in the source data is irregular
free-form text (e.g. "24小時" vs. specific ranges), so it's displayed as-is
rather than parsed into a live "open now" status.

## Deployment

Deployed on GitHub Pages directly from the `main` branch root — every push
to `main` redeploys automatically, no CI/CD pipeline needed. All asset
paths in the app are relative, so the app works correctly whether hosted
at a domain root or a subpath like `/taipei-smoking-map/`.

## Non-goals

By design, this project intentionally does **not** include: user accounts
or login, a backend API or database, push notifications, payments, or ads.
It's meant to stay a simple, free, static tool.

## License

Open source. Smoking area data © Taipei City Government open data
platform; see the in-app disclaimer for the standard reference-only note
attached to each site.
