# Agent notes — Züri City

Guidance for coding agents working in this repository. Prefer this file over
legacy Codex-specific notes.

## Product

**Züri City** ([zuri.city](https://zuri.city/)) is a mobile-friendly SvelteKit app:
**the interactive city**, a walkable **3D map of Zürich**. The foundation of the experience is
the living map — SWISSIMAGE aerial basemap, **ghost OSM building massing**
(desaturated extrusions over the orthophoto), **swisstopo terrain**, and
**congestion-colored streets** on OpenMapTiles centerlines (**green** / **amber** /
**red**). Parking from the
[Parkleitsystem Zürich](https://www.pls-zh.ch/) is always on the map in **blue**
(list panel optional).

Zoom only changes camera distance — not which city systems are visible. Colored
street lines are the primary traffic UX; cars are secondary decoration. Prefer
free swisstopo / OSM sources; do not require Google Photorealistic 3D Tiles or
Cesium ion keys for the default experience.

## Stack

- **Runtime:** Node.js **24.x** (see `.nvmrc`, `.node-version`, `package.json`)
- **App:** Svelte 5, SvelteKit 2, Vite 8, Tailwind CSS 4, TypeScript (~6.0)
- **Map:** MapLibre GL — one engine for aerial, terrain, massing, traffic, and overlays.
  Style builder: `src/lib/map/aerialStyle.ts`
- **Icons:** `src/lib/map/iconAtlas.ts` pre-registers place + aircraft sprites before
  symbol layers paint; `src/lib/intel/aircraftIcons.ts` draws planform silhouettes
- **Continuous swisstopo:** `swissSources.ts`, `swissTerrain.ts` (quantized-mesh;
  Terrarium DEM fallback). **swissBUILDINGS3D** is phase-2 (`PUBLIC_SWISS_BUILDINGS=1`,
  `swissBuildingsLayer.ts`) — off by default
- **Camera contract:** city min/max zoom in `swissSources.ts` (orbit/walk are pose-only)
- **Living traffic:** OMT `transportation` centerlines in `aerialStyle.ts` (static dashes;
  no per-frame RAF). Cars are a future accent layer
- **Deploy:** Vercel adapter; local `npm run dev` is **HTTPS only**
  Preview hostname: **https://new.zuri.city** (branch deploy alias; production remains zuri.city)

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

See **`src/lib/ARCHITECTURE.md`** for the scalable package layout and “how to add a layer”.

| Area | Location |
| --- | --- |
| Route (thin) | `src/routes/+page.svelte` → `CityExperience` |
| Immersive shell / HUD | `src/lib/shell/CityExperience.svelte` |
| Session stores | `src/lib/state/citySession.ts` |
| Map host | `src/lib/city/ZurichCity.svelte` |
| Map overlay plugins | `src/lib/map/layers/*` |
| Places domain | `src/lib/places/` (`$lib/city/places` re-exports) |
| Parking domain | `src/lib/parking/` (`$lib/parking` barrel) |
| Aerial / terrain / buildings | `src/lib/map/*` |
| Live intel (ADS-B, CCTV, quakes) | `src/lib/intel/*`, `src/lib/server/intel.ts` |
| Layer toggle registry | `src/lib/city/layerRegistry.ts` |

Intel layer **Live streets** (`traffic`) toggles colored OMT centerline overlays.

**Scalability rules:** keep routes thin; put new overlays in `map/layers/`; keep domain
types out of the map host; prefer `citySession` stores when multiple UI surfaces share
state.

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

- Keep **one continuous city** across zoom: no layer pop-in / building-height morph /
  car spawn gates inside the city zoom contract.
- Keep **colored traffic streets** as the readable traffic signal; cars stay accents
  that remain present (density by viewport, not zoom buckets).
- Prefer free OSM / OpenFreeMap / swisstopo sources over paid live-traffic APIs
  unless the product owner asks otherwise.
- Parking stays always-visible in blue (not a map-layer toggle).
- Match existing MapLibre patterns; avoid reintroducing Leaflet for the city view.
- Prefer small, focused diffs; update this file when product foundations change.
