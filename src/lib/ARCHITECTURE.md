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
      types.ts                 # PlaceCategory, colors, labels
      catalog.ts               # FALLBACK_PLACES curated seeds
      geo.ts                   # GeoJSON + haversine
    parking/                   # PLS parking domain
      model.ts                 # Parse, availability, map labels
    map/
      aerialStyle.ts           # Basemap style builder
      swissSources.ts          # Zoom contract + swisstopo endpoints
      swissTerrain.ts
      swissBuildingsLayer.ts
      layers/                  # Overlay plugins (ensure/sync)
        types.ts               # CityLayerPlugin contract
        placesLayer.ts
        parkingLayer.ts
    city/                      # Map host + HUD widgets (legacy path, shrinking)
      ZurichCity.svelte        # MapLibre host; delegates overlays to map/layers
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
3. **Map overlays are plugins.** Each feed implements idempotent `ensure` + `sync`
   under `map/layers/`. `ZurichCity` is a host (camera, style, click routing).
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
  └─ hydrateCity → places + parkings + intel

CityExperience
  ├─ merges hydrate into local/session state
  ├─ polls /api/intel
  └─ passes filtered feeds → ZurichCity

ZurichCity
  ├─ aerial style + terrain
  ├─ map/layers/* ensure+sync
  └─ orbit/walk camera
```

## Adding a layer

1. Add types + fetch helpers in the domain package (`intel`, `places`, …).
2. Add `src/lib/map/layers/<name>Layer.ts` with `ensure` / `sync`.
3. Register the toggle in `layerRegistry` + `LayersPanel`.
4. Wire visibility from `CityExperience` → `ZurichCity` props → plugin `sync`.

Do not paste new `addLayer` blocks into the middle of `ZurichCity.svelte`.
