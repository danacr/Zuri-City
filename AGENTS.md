# Agent notes — Züri City

Guidance for coding agents working in this repository. Prefer this file over
legacy Codex-specific notes.

## Product

**Züri City** ([zuri.city](https://zuri.city/)) is a mobile-friendly SvelteKit app:
a god’s-eye / walkable **3D map of Zürich**. The foundation of the experience is
the **living city** — SWISSIMAGE aerial basemap, extruded OSM buildings, and
**small simulated cars** driving along OpenMapTiles road centerlines. Density and
speed vary with modeled congestion (**green** = free/few/fast, **amber** = busy,
**red** = jam/many/slow). Parking from the
[Parkleitsystem Zürich](https://www.pls-zh.ch/) is a **toggle overlay**, not the
main product.

Do not reintroduce colored traffic polylines as the primary traffic UX. Cars are
the traffic layer. Do not require Google Photorealistic 3D Tiles or Cesium keys
for the default experience.

## Stack

- **Runtime:** Node.js **24.x** (see `.nvmrc`, `.node-version`, `package.json`)
- **App:** Svelte 5, SvelteKit 2, Vite 8, Tailwind CSS 4, TypeScript (~6.0)
- **Map:** MapLibre GL (not Leaflet). Style builder: `src/lib/map/aerialStyle.ts`
- **Living traffic:** `src/lib/city/trafficCars.ts` + GeoJSON symbol layer in
  `src/lib/city/ZurichCity.svelte`
- **Deploy:** Vercel adapter; local `npm run dev` is **HTTPS only**

A scoped `cookie` override may exist for a SvelteKit transitive security fix —
remove it when upstream ships a fixed version.

## Getting started

```bash
nvm use   # if you use nvm
npm ci
npm run dev
```

Dev server listens on `0.0.0.0` (default port `5173`). Open the **https://** URL
Vite prints. HTTP is not supported.

```bash
npm run dev -- --port 3000
```

### Trust the local HTTPS certificate

On first start, Vite writes a project-local CA and server cert under ignored
`.certs/`. Restart Vite after changing networks so SANs stay current.

Trust `.certs/rootCA.crt` on each device:

- **macOS:** Keychain Access → Always Trust for SSL → restart the browser if needed.
- **iPhone/iPad:** AirDrop only `rootCA.crt` → install the profile →
  **Settings → General → About → Certificate Trust Settings** → enable full trust
  for **Zuri City Local Development CA**. Open the HTTPS Network URL in Safari.

Location APIs need a trusted secure context; bypassing a cert warning is not
enough. Keep `*-key.pem` private; only transfer `rootCA.crt`.

If you see `ERR_SSL_PROTOCOL_ERROR`, stop any old HTTP server and restart with
`npm run dev`. On macOS without OpenSSL: `brew install openssl`.

## Architecture (map-first)

| Area | Location |
| --- | --- |
| City map UI | `src/lib/city/ZurichCity.svelte` |
| Places | `src/lib/city/places.ts` |
| Car simulation | `src/lib/city/trafficCars.ts` |
| Aerial / 3D style | `src/lib/map/aerialStyle.ts` |
| Parking feed + panel | `src/lib/parking*`, `src/lib/ParkingPanel.svelte` |
| Live intel (ADS-B, CCTV, quakes) | `src/lib/intel/*`, `src/lib/server/intel.ts` |
| Page shell / HUD | `src/routes/+page.svelte` |

Intel layer **Live streets** (`traffic`) toggles the car simulation. Invisible
layer `traffic-roads-query` exists only so the map can query road geometry.

## Parking data

On page load / refresh, the server reads the full PLS RSS feed (no status
filter), then fetches each garage’s details and map page for capacity and
coordinates. There is no fixed garage ID list or capacity cache. Metadata uses
bounded concurrency and a shared ~12s timeout; failed metadata leaves fields
unknown. RSS failure is reported — do not silently substitute a stale list.

## Checks

```bash
npm run check
npm run test:unit -- --run
npm run lint
npx playwright install chromium
npm test
npm run format
```

Production:

```bash
npm run build
npm run preview
# optional network preview:
npm run preview -- --host 0.0.0.0
```

## SEO and icons

Canonical production URL: **https://zuri.city/** (`PUBLIC_SITE_URL` can override).
`/robots.txt` and `/sitemap.xml` advertise the homepage. Non-canonical hosts use
`noindex`.

Favicon source: `static/favicon.svg`. Regenerate ICO/PNG with
`node scripts/generate-icons.mjs` (Playwright Chromium) or
`PLAYWRIGHT_CHANNEL=chrome node scripts/generate-icons.mjs`.

## Pull requests

The canonical in-progress product branch is **`cursor/zurich-city-3d-view-abf9`**
([PR #1](https://github.com/danacr/Zuri-City/pull/1)). Open new feature branches
and PRs **against that branch**, not against `main`, until PR #1 merges.

Branch names: `cursor/<short-description>-abf9`.

## Agent preferences

- Keep the **living streets / car simulation** as the map foundation.
- Prefer free OSM / OpenFreeMap / swisstopo sources over paid live-traffic APIs
  unless the product owner asks otherwise.
- Preserve parking as an optional feature layer.
- Match existing MapLibre patterns; avoid reintroducing Leaflet for the city view.
- Prefer small, focused diffs; update this file when product foundations change.
