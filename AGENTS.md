# Agent notes — Züri City

Guidance for coding agents working in this repository. Prefer this file over
legacy Codex-specific notes.

## Pre-human MR review (automation-only)

Do **not** ask a human to review look until automated layers have run.
Source of truth: [`.cursor/automations/README.md`](.cursor/automations/README.md).

| Layer | Mechanism |
| --- | --- |
| Path signal (optional) | `.github/workflows/label-ui-prs.yml` may stamp `ui` — **not required** |
| Quality CI | `.github/workflows/quality.yml` → `npm run quality` |
| Code bot | Cursor Bugbot |
| UI contract | `.cursor/automations/ui-pr-review.md` — triggers on PR open/push; **detects UI from the diff** |
| Maps power-user | `.cursor/automations/maps-power-user-review.md` — same; beat Google/HERE |
| Remediate | `.cursor/automations/act-on-review-comments.md` — on bot comments, fix blocking → push → reply |

Activate the three Cursor Automations once after merge (dashboard; no create API). Prefer Team Owned. Triggers for review bots: **PR opened + pushed** — no label/tag. Review bots must **skip merged/closed PRs**; re-paste prompts from `.cursor/automations/` when those files change.

## Product

**Züri City** ([zuri.city](https://zuri.city/)) is a **living city** on a mobile-friendly
SvelteKit map — not a static postcard. The core loop: you walk (or pan/zoom) through
Zürich and the map reveals what’s around you — places that are **open now**, with
**hours, phone numbers, and websites** you can open from the place sheet. POIs load
**progressively with the viewport** so denser streets appear as you move, not only a
fixed downtown seed list.

The foundation is still the map itself — SWISSIMAGE aerial, **solid OSM building
massing** (opaque fill-extrusions that read as real volume on terrain — not
translucent “ghost” boxes), **swisstopo terrain**, and **live roadworks /
disruptions** (Kanton Zürich Baustellen WFS + OSM construction — keyless;
amber / red corridors; never a road-name hash). Parking from the
[Parkleitsystem Zürich](https://www.pls-zh.ch/) starts **on** as **blue capacity
pills** (toggleable in Layers; list panel optional). Place and aircraft markers use
**sprites**, never raw MapLibre circles as the primary glyph. Do **not** ship
cosmetic “sensor look” color filters that recolor the city.

Product voice for UI/SEO: concrete Zürich, calm confidence. Prefer “living city” /
“live map” / “Zürich · live” over vague “interactive city” filler.

Zoom and movement change what you notice nearby — denser POIs as you walk —
while city systems (massing, traffic, parking default) stay available. Colored
street lines are the primary traffic UX; cars are secondary decoration. Prefer
free swisstopo / OSM sources; do not require Google Photorealistic 3D Tiles or
Cesium ion keys for the default experience.


### Quality bar — never ship a broken city

Do **not** open or update a PR as “done” while any of these fail on mobile preview:

1. **Solid 3D massing** — buildings must read as volume on terrain at orbit and walk.
   Translucent “ghost” extrusions that disappear into the aerial are a reject.
2. **Live PLS parking** — blue/green/red pills with capacity labels after hydrate; defaults on.
   Labels-only parking is a reject. Layers may toggle visibility — do not hard-lock the switch.
3. **Orbit ≠ Walk** — orbit inspects the basin (lower pitch, free overview). Walk is
   street immersion (locked high pitch, locomotion). Pose-only identical modes are a reject.
4. **Sprites, not dots** — places and aircraft use icon atlas sprites. Purple CCTV
   circles must not dominate the first viewport (cameras default off; sprite when on).
5. **Traffic on OMT centerlines** — thin enough to read as streets, not thick ribbons
   floating off the aerial.
6. **Terrain/aerial stability** — no mid-screen tile tears from overzoomed DEM; idle RAF = 0.
7. **One MapLibre engine** — no Cesium / dual-WebGL experiments on the default path.

Failed Cesium and “ghost massing” rebuilds taught this: a half-working 3D stack is worse
than shipping nothing. Keep iterating on **one PR** until the checklist above is green.

## Stack

- **Runtime:** Node.js **24.x** (see `.nvmrc`, `.node-version`, `package.json`)
- **App:** Svelte 5, SvelteKit 2, Vite 8, Tailwind CSS 4, TypeScript (~6.0)
- **Map:** MapLibre GL — one engine for aerial, terrain, massing, traffic, and overlays.
  Style builder: `src/lib/map/aerialStyle.ts`
- **Icons:** `src/lib/map/iconAtlas.ts` pre-registers place + aircraft + CCTV sprites
  before symbol layers paint; `src/lib/intel/aircraftIcons.ts` draws planform silhouettes
- **Continuous swisstopo:** `swissSources.ts`, `swissTerrain.ts` (quantized-mesh;
  Terrarium DEM fallback). **swissBUILDINGS3D** is phase-2 (`PUBLIC_SWISS_BUILDINGS=1`,
  `swissBuildingsLayer.ts`) — off by default; default massing is solid OSM extrusions
- **Camera contract:** city min/max zoom in `swissSources.ts`. Orbit and walk share
  layers but **differ in pose + interaction** (walk locks high pitch / enables look)
- **Living traffic:** OMT `transportation` centerlines in `aerialStyle.ts` (static dashes;
  no per-frame RAF). Cars are a future accent layer
- **Parking:** live PLS pills via `map/layers/parkingLayer.ts` — default on, toggleable in Layers
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

### Quality gate — required before presenting ready

Do **not** tell the user a preview is ready until this passes locally:

```bash
npm run quality
```

That runs, in order:

1. `npm run check` — types / Svelte
2. `npm run quality:unit` — unit + acceptance contract tests (buildings, parking, sprites, cameras-off, orbit≠walk)
3. `npm run build` — production build
4. `npm run quality:e2e` — Playwright **mobile-first** acceptance (`tests/acceptance.spec.ts`)

Playwright acceptance covers:

- Map boots `data-map-ready=true` on iPhone viewport (390×844)
- Solid OSM buildings layer + opacity ≥ 0.7
- Parking pills + labels present after hydrate
- Traffic flow layer present
- Place + aircraft sprites registered
- Orbit vs Walk diverge in pitch/zoom; walk shows status hint
- Cameras default off; parking defaults on and is toggleable in Layers
- Map remains the primary mobile surface

After `quality` is green, present the **Vercel preview URL** for the PR branch. The human review should then be about the implementation look — not discovering broken parking, flat buildings, or identical Orbit/Walk.

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
- Parking defaults on as **blue capacity pills** (toggleable in Layers).
- Match existing MapLibre patterns; avoid reintroducing Leaflet or Cesium for the
  default city view.
- Prefer small, focused diffs; update this file when product foundations change.
- Treat the product as a **living city**: progressive nearby POIs with open/hours/phone/web as you move.
- Do not reintroduce sensor “Look” color filters (NVG/FLIR/etc.) over the map.
- **Never present a non-professional / non-working outcome as complete.** If buildings
  are flat, parking missing, icons are dots, or orbit≈walk on mobile, keep fixing the
  same PR — do not open a celebratory summary.
- **Always run `npm run quality` before presenting a preview as ready.** Human review
  should only need to judge the implementation — not rediscover broken features.
