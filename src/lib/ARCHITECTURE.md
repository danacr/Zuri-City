# Züri City architecture

Scalable layout for the interactive Zürich map. New features should land in the
domain package that owns them — not in `routes/+page.svelte` or by growing
`ZurichCity.svelte` further.

## Package map

```
src/
  routes/                      # Thin HTTP edge: loaders, SEO head, compose shell
    +page.svelte               # <svelte:head> + <CityExperience />
    +page.server.ts            # Fast shell + streamed hydrateCity
    api/                       # Intel poll, CCTV proxy
  lib/
    shell/                     # Immersive viewport, HUD chrome, gestures wiring
      CityExperience.svelte    # Page UI + session orchestration
    state/
      citySession.ts           # Shared writable stores (mode, layers, feeds)
    places/                    # Place domain
      types.ts
      catalog.ts               # FALLBACK_PLACES curated seeds
      geo.ts
    parking/                   # PLS parking domain
      model.ts
    map/
      swissSources.ts          # Zoom contract + swisstopo endpoints
      cesiumCity.ts            # Cesium Viewer: SWISSIMAGE + buildings + terrain
      cesiumCamera.ts          # Zoom↔height + orbit/walk poses
      zurichArteries.ts        # Traffic corridor polylines
      layers/
        cesiumOverlays.ts      # Places/parking/intel entity sync
        types.ts               # CityLayerPlugin contract
    city/                      # Map host + HUD widgets
      ZurichCity.svelte        # Cesium host; camera + overlay orchestration
      LayersPanel.svelte
      mapShellGestures.ts
      layerRegistry.ts
    intel/                     # Flights, cameras, quakes, icons
    server/                    # Node-only loaders (Overpass, PLS enrich, ADS-B)
```

## Rules

1. **Routes stay thin.** Load data, set SEO, render `CityExperience`.
2. **Domain packages own data.** Places, parking, and intel types/helpers live under
   their package — not in the map host.
3. **One map engine: CesiumJS.** Imagery tiles, 3D buildings, and terrain share one
   Viewer. Overlays sync through `map/layers/cesiumOverlays`. Do not bolt on a second
   WebGL stack (MapLibre/Three) for city massing.
4. **Shared UI state uses `state/citySession`.** Prefer stores over growing another
   1k-line component `let` block when multiple surfaces need the same toggles.
5. **Server code stays in `lib/server`.** Never import server modules from client
   components.
6. **Compatibility shims.** `$lib/city/places` and `$lib/parking.ts` re-export the
   new packages so existing imports keep working during migration.

## Data flow

```
+page.server.ts
  ├─ sync: FALLBACK_PLACES, empty parkings/intel (instant shell)
  └─ hydrateCity → places + parkings + intel (merge-by-id on client)

CityExperience
  ├─ merges hydrate into local/session state (never blanks FALLBACK)
  ├─ polls /api/intel
  └─ passes filtered feeds → ZurichCity

ZurichCity (Cesium)
  ├─ SWISSIMAGE + swissBUILDINGS3D + terrain
  ├─ cesiumOverlays sync
  └─ orbit/walk camera
```

## Adding a layer

1. Add types + fetch helpers in the domain package (`intel`, `places`, …).
2. Extend `src/lib/map/layers/cesiumOverlays.ts` (or add a sibling helper) with
   ensure/sync against the Cesium Viewer.
3. Register the toggle in `layerRegistry` + `LayersPanel`.
4. Wire visibility from `CityExperience` → `ZurichCity` props → overlay sync.

Do not paste new overlay blocks into the middle of `ZurichCity.svelte` beyond thin wiring.
