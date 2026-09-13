<script lang="ts">
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import type {
		GeoJSONSource,
		Map as MapLibreMap,
		Marker
	} from 'maplibre-gl';
	import {
		ZURICH_CENTER,
		placesToGeoJSON,
		type Place,
		type PlaceCategory
	} from './places';
	import { type Parking } from '$lib/parking';
	import { syncParkingLayer, syncPlacesLayer } from '$lib/map/layers';
	import {
		cameraViewshedsGeoJSON,
		camerasToGeoJSON,
		flightsToGeoJSON,
		quakesToGeoJSON
	} from '$lib/intel/geo';
	import type { Camera, Flight, IntelLayer, Quake } from '$lib/intel/types';
	import { TRAFFIC_STYLE_LAYERS, zurichAerialStyle } from '$lib/map/aerialStyle';
	import {
		CITY_MAX_ZOOM,
		CITY_MIN_ZOOM,
		ORBIT_CAMERA,
		SWISS_BUILDINGS_ENABLED,
		WALK_CAMERA
	} from '$lib/map/swissSources';
	import { attachSwissTerrain, type TerrainHandle } from '$lib/map/swissTerrain';
	import {
		attachIconAtlasResolver,
		ensureBaseIconAtlas,
		registerFlightIcons,
		registerPlaceIcons
	} from '$lib/map/iconAtlas';
	import { createDefaultIntelLayers, PARKING_LAYER } from '$lib/city/layerRegistry';

	export let places: Place[];
	export let parkings: Parking[] = [];
	export let layers: Record<PlaceCategory, boolean>;
	export let showParking = PARKING_LAYER.defaultVisible;
	export let intelLayers: Record<IntelLayer, boolean> = createDefaultIntelLayers();
	export let flights: Flight[] = [];
	export let cameras: Camera[] = [];
	export let quakes: Quake[] = [];
	export let mode: 'orbit' | 'walk' = 'orbit';
	export let selectedId: string | null = null;
	export let userPosition: [number, number] | null = null;

	const dispatch = createEventDispatcher<{
		select: { id: string; kind: 'place' | 'parking' | 'flight' | 'camera' | 'quake' };
		ready: void;
		error: void;
	}>();

	let container: HTMLDivElement;
	let map: MapLibreMap | undefined;
	let disposed = false;
	let styleReady = false;
	let mapError = '';
	let userMarker: Marker | undefined;
	let keys = new Set<string>();
	let raf = 0;
	let walkBearing = -20;
	let terrainHandle: TerrainHandle | undefined;

	$: visiblePlaces = places.filter((place) => layers[place.category]);
	$: visibleParkings = showParking
		? parkings.filter((parking) => parking.coordinates !== null)
		: [];
	$: visibleFlights = intelLayers.flights ? flights : [];
	$: visibleCameras = intelLayers.cameras ? cameras : [];
	$: visibleQuakes = intelLayers.quakes ? quakes : [];

	$: if (map?.getSource('places')) {
		(map.getSource('places') as GeoJSONSource).setData(placesToGeoJSON(visiblePlaces));
	}
	$: if (map?.getSource('parking')) {
		syncParkingLayer(map, visibleParkings, showParking);
	}
	$: if (map && styleReady) {
		const visibility = showParking ? 'visible' : 'none';
		if (map.getLayer('parking-label')) {
			map.setLayoutProperty('parking-label', 'visibility', visibility);
		}
	}
	$: if (map?.getSource('flights')) {
		registerFlightIcons(map, visibleFlights);
		(map.getSource('flights') as GeoJSONSource).setData(flightsToGeoJSON(visibleFlights));
	}
	$: if (map?.getSource('cameras')) {
		(map.getSource('cameras') as GeoJSONSource).setData(camerasToGeoJSON(visibleCameras));
	}
	$: if (map?.getSource('viewsheds')) {
		(map.getSource('viewsheds') as GeoJSONSource).setData(
			cameraViewshedsGeoJSON(intelLayers.detection ? visibleCameras : [])
		);
	}
	$: if (map && styleReady && map.getLayer('camera-viewsheds')) {
		map.setLayoutProperty(
			'camera-viewsheds',
			'visibility',
			intelLayers.detection && intelLayers.cameras ? 'visible' : 'none'
		);
	}
	$: if (map?.getSource('quakes')) {
		(map.getSource('quakes') as GeoJSONSource).setData(quakesToGeoJSON(visibleQuakes));
	}
	$: if (map && styleReady) {
		syncTrafficVisibility(map, intelLayers.traffic);
	}
	let lastAppliedMode: 'orbit' | 'walk' | null = null;
	$: if (map && mode && mode !== lastAppliedMode) {
		lastAppliedMode = mode;
		applyMode(mode, false);
	}
	$: if (map && selectedId) focusSelection(selectedId);
	$: if (map && userPosition) syncUserMarker(userPosition);

	// parkings GeoJSON: $lib/map/layers/parkingLayer

	/** Phase-2 swissBUILDINGS3D — gated by PUBLIC_SWISS_BUILDINGS. */
	async function mountSwissOverlay(
		mapInstance: MapLibreMap,
		maplibregl: typeof import('maplibre-gl')
	) {
		if (!SWISS_BUILDINGS_ENABLED) return;
		try {
			const { createSwissBuildingsLayer, SWISS_BUILDINGS_LAYER_ID } = await import(
				'$lib/map/swissBuildingsLayer'
			);
			if (disposed || mapInstance.getLayer(SWISS_BUILDINGS_LAYER_ID)) return;
			mapInstance.addLayer(createSwissBuildingsLayer(maplibregl));
			if (mapInstance.getLayer('osm-buildings-3d')) {
				mapInstance.setPaintProperty('osm-buildings-3d', 'fill-extrusion-opacity', 0.18);
			}
		} catch (error) {
			console.warn('swissBUILDINGS3D unavailable', error);
		}
	}

	function applyMode(next: 'orbit' | 'walk', animate = true) {
		if (!map) return;
		const camera =
			next === 'walk'
				? {
						zoom: WALK_CAMERA.zoom,
						pitch: WALK_CAMERA.pitch,
						bearing: walkBearing,
						center: map.getCenter()
				  }
				: {
						zoom: ORBIT_CAMERA.zoom,
						pitch: ORBIT_CAMERA.pitch,
						bearing: ORBIT_CAMERA.bearing,
						center: ZURICH_CENTER
				  };
		if (animate) map.easeTo({ ...camera, duration: 1400 });
		else map.jumpTo(camera);
	}

	function focusSelection(id: string) {
		if (!map) return;
		const place = places.find((item) => item.id === id);
		if (place) {
			map.easeTo({
				center: [place.lon, place.lat],
				zoom: Math.max(map.getZoom(), 16.5),
				pitch: mode === 'walk' ? 72 : 62,
				duration: 900
			});
			return;
		}
		const parking = parkings.find((item) => (item.id || item.name) === id);
		if (parking?.coordinates) {
			map.easeTo({
				center: [parking.coordinates[1], parking.coordinates[0]],
				zoom: Math.max(map.getZoom(), 16),
				duration: 900
			});
			return;
		}
		const flight = flights.find((item) => item.id === id);
		if (flight) {
			map.easeTo({
				center: [flight.lon, flight.lat],
				zoom: Math.max(CITY_MIN_ZOOM, 12.5),
				pitch: 55,
				bearing: flight.heading ?? map.getBearing(),
				duration: 1200
			});
			return;
		}
		const camera = cameras.find((item) => item.id === id);
		if (camera) {
			map.easeTo({
				center: [camera.lon, camera.lat],
				zoom: 16.8,
				pitch: 65,
				bearing: camera.bearing,
				duration: 1000
			});
		}
	}

	function syncUserMarker(position: [number, number]) {
		if (!map) return;
		import('maplibre-gl').then((maplibregl) => {
			if (disposed || !map) return;
			const lngLat: [number, number] = [position[1], position[0]];
			if (!userMarker) {
				const el = document.createElement('div');
				el.className = 'user-pulse';
				userMarker = new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map);
			} else userMarker.setLngLat(lngLat);
		});
	}

	/** Re-push GeoJSON so MapLibre finishes loading overlays (first paint often races). */
	function refreshOverlaySources(mapInstance: MapLibreMap = map!) {
		if (!mapInstance) return;
		const placesSource = mapInstance.getSource('places') as GeoJSONSource | undefined;
		placesSource?.setData(placesToGeoJSON(visiblePlaces));
		syncParkingLayer(mapInstance, visibleParkings, showParking);
		const flightsSource = mapInstance.getSource('flights') as GeoJSONSource | undefined;
		if (flightsSource) {
			registerFlightIcons(mapInstance, visibleFlights);
			flightsSource.setData(flightsToGeoJSON(visibleFlights));
		}
		const camerasSource = mapInstance.getSource('cameras') as GeoJSONSource | undefined;
		camerasSource?.setData(camerasToGeoJSON(visibleCameras));
		const viewshedsSource = mapInstance.getSource('viewsheds') as GeoJSONSource | undefined;
		viewshedsSource?.setData(
			cameraViewshedsGeoJSON(intelLayers.detection ? visibleCameras : [])
		);
		const quakesSource = mapInstance.getSource('quakes') as GeoJSONSource | undefined;
		quakesSource?.setData(quakesToGeoJSON(visibleQuakes));
		mapInstance.triggerRepaint();
	}

	function ensureLayers(mapInstance: MapLibreMap) {
		registerPlaceIcons(mapInstance);
		ensureBaseIconAtlas(mapInstance);
		syncPlacesLayer(mapInstance, visiblePlaces);
		syncParkingLayer(mapInstance, visibleParkings, showParking);

		if (!mapInstance.getSource('parking')) {
			mapInstance.addSource('parking', {
				type: 'geojson',
				data: { type: 'FeatureCollection', features: [] }
			});
			mapInstance.addLayer({
				id: 'parking-label',
				type: 'symbol',
				source: 'parking',
				layout: {
					visibility: showParking ? 'visible' : 'none',
					'text-field': ['get', 'label'],
					'text-size': [
						'interpolate',
						['linear'],
						['zoom'],
						12,
						11,
						15,
						13,
						17,
						15
					],
					'text-font': ['Noto Sans Bold'],
					'text-anchor': 'center',
					'text-allow-overlap': true,
					'text-ignore-placement': true,
					'text-padding': 2
				},
				paint: {
					'text-color': [
						'match',
						['get', 'tone'],
						'green',
						'#1b6b2e',
						'red',
						'#a61e1e',
						'#1c4d7a'
					],
					'text-halo-color': '#ffffff',
					'text-halo-width': 2.4,
					'text-halo-blur': 0.2
				}
			});
		} else if (mapInstance.getLayer('parking-pill')) {
			mapInstance.removeLayer('parking-pill');
		}

		// Viewsheds / cameras / flights sit above the basemap; cars are ensured at the end.

		if (!mapInstance.getSource('viewsheds')) {
			mapInstance.addSource('viewsheds', {
				type: 'geojson',
				data: cameraViewshedsGeoJSON(visibleCameras)
			});
			mapInstance.addLayer({
				id: 'camera-viewsheds',
				type: 'fill',
				source: 'viewsheds',
				layout: {
					visibility:
						intelLayers.detection && intelLayers.cameras ? 'visible' : 'none'
				},
				paint: {
					'fill-color': '#7c5cff',
					'fill-opacity': 0.14
				}
			});
		}

		if (!mapInstance.getSource('cameras')) {
			mapInstance.addSource('cameras', {
				type: 'geojson',
				data: camerasToGeoJSON(visibleCameras)
			});
			mapInstance.addLayer({
				id: 'cameras-core',
				type: 'circle',
				source: 'cameras',
				paint: {
					'circle-radius': 7,
					'circle-color': '#7c5cff',
					'circle-stroke-width': 2,
					'circle-stroke-color': '#ffffff'
				}
			});
			mapInstance.addLayer({
				id: 'cameras-label',
				type: 'symbol',
				source: 'cameras',
				layout: {
					'text-field': 'CCTV',
					'text-size': 9,
					'text-offset': [0, 1.3],
					'text-font': ['Noto Sans Bold']
				},
				paint: {
					'text-color': '#4c3d99',
					'text-halo-color': '#ffffff',
					'text-halo-width': 1.2
				}
			});
		}

		if (!mapInstance.getSource('flights')) {
			mapInstance.addSource('flights', {
				type: 'geojson',
				data: flightsToGeoJSON(visibleFlights)
			});
			registerFlightIcons(mapInstance, visibleFlights);
			mapInstance.addLayer({
				id: 'flights-core',
				type: 'symbol',
				source: 'flights',
				layout: {
					'icon-image': ['coalesce', ['get', 'icon'], 'plane-narrow-gen'],
					'icon-size': [
						'interpolate',
						['linear'],
						['zoom'],
						8,
						[
							'match',
							['get', 'family'],
							'ga',
							0.35,
							'regional',
							0.42,
							'narrow',
							0.48,
							'wide-twin',
							0.58,
							'wide-quad',
							0.64,
							'rotor',
							0.38,
							0.45
						],
						12,
						[
							'match',
							['get', 'family'],
							'ga',
							0.62,
							'regional',
							0.82,
							'narrow',
							0.92,
							'wide-twin',
							1.12,
							'wide-quad',
							1.22,
							'rotor',
							0.72,
							0.88
						],
						15,
						[
							'match',
							['get', 'family'],
							'ga',
							0.85,
							'regional',
							1.05,
							'narrow',
							1.15,
							'wide-twin',
							1.35,
							'wide-quad',
							1.45,
							'rotor',
							0.95,
							1.1
						]
					],
					'icon-rotate': ['coalesce', ['get', 'heading'], 0],
					'icon-rotation-alignment': 'map',
					'icon-allow-overlap': true,
					'icon-ignore-placement': true,
					'text-field': ['get', 'callsign'],
					'text-size': 11,
					'text-offset': [0, 1.85],
					'text-font': ['Noto Sans Bold'],
					'text-allow-overlap': true,
					'text-ignore-placement': true
				},
				paint: {
					'text-color': '#ffe8a3',
					'text-halo-color': '#1a1303',
					'text-halo-width': 1.6,
					'text-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0, 11, 0.95]
				}
			});
		}

		if (!mapInstance.getSource('quakes')) {
			mapInstance.addSource('quakes', {
				type: 'geojson',
				data: quakesToGeoJSON(visibleQuakes)
			});
			mapInstance.addLayer({
				id: 'quakes-core',
				type: 'circle',
				source: 'quakes',
				paint: {
					'circle-radius': ['get', 'radius'],
					'circle-color': '#e64980',
					'circle-opacity': 0.35,
					'circle-stroke-width': 2,
					'circle-stroke-color': '#f783ac'
				}
			});
		}

		syncTrafficVisibility(mapInstance, intelLayers.traffic);
	}


	function syncTrafficVisibility(mapInstance: MapLibreMap, on: boolean) {
		const visibility = on ? 'visible' : 'none';
		for (const id of TRAFFIC_STYLE_LAYERS) {
			if (mapInstance.getLayer(id)) {
				mapInstance.setLayoutProperty(id, 'visibility', visibility);
			}
		}
	}


	function kindFromLayer(layerId: string) {
		if (layerId.startsWith('flights')) return 'flight' as const;
		if (layerId.startsWith('cameras') || layerId === 'detection-cameras') return 'camera' as const;
		if (layerId.startsWith('quakes')) return 'quake' as const;
		return 'place' as const;
	}

	function onClick(event: {
		features?: { properties?: Record<string, unknown>; layer?: { id?: string } }[];
	}) {
		const feature = event.features?.[0];
		const id = feature?.properties?.id;
		if (id == null) return;
		dispatch('select', { id: String(id), kind: kindFromLayer(feature?.layer?.id || '') });
	}

	function stepWalk() {
		raf = 0;
		if (!map || disposed || mode !== 'walk' || keys.size === 0) {
			return;
		}
		const center = map.getCenter();
		const zoom = map.getZoom();
		const step = (zoom > 17 ? 0.000018 : 0.00003) * (keys.has('shift') ? 2.4 : 1);
		let bearing = map.getBearing();
		let dLng = 0;
		let dLat = 0;
		const rad = (bearing * Math.PI) / 180;
		if (keys.has('w') || keys.has('arrowup')) {
			dLng += Math.sin(rad) * step;
			dLat += Math.cos(rad) * step;
		}
		if (keys.has('s') || keys.has('arrowdown')) {
			dLng -= Math.sin(rad) * step;
			dLat -= Math.cos(rad) * step;
		}
		if (keys.has('a') || keys.has('arrowleft')) {
			dLng -= Math.cos(rad) * step;
			dLat += Math.sin(rad) * step;
		}
		if (keys.has('d') || keys.has('arrowright')) {
			dLng += Math.cos(rad) * step;
			dLat -= Math.sin(rad) * step;
		}
		if (keys.has('q')) bearing -= 1.6;
		if (keys.has('e')) bearing += 1.6;
		walkBearing = bearing;
		if (dLng || dLat || keys.has('q') || keys.has('e')) {
			map.jumpTo({
				center: [center.lng + dLng, center.lat + dLat],
				bearing,
				pitch: 72,
				zoom
			});
		}
		raf = requestAnimationFrame(stepWalk);
	}

	onMount(() => {
		let resizeObserver: ResizeObserver | undefined;
		async function boot() {
			try {
				const maplibregl = await import('maplibre-gl');
				await import('maplibre-gl/dist/maplibre-gl.css');
				const workerUrl = (await import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'))
					.default;
				maplibregl.setWorkerUrl(workerUrl);
				if (disposed) return;
				const instance = new maplibregl.Map({
					container,
					style: zurichAerialStyle(),
					center: ZURICH_CENTER,
					zoom: ORBIT_CAMERA.zoom,
					pitch: ORBIT_CAMERA.pitch,
					bearing: ORBIT_CAMERA.bearing,
					minZoom: CITY_MIN_ZOOM,
					maxZoom: CITY_MAX_ZOOM,
					maxPitch: 80,
					attributionControl: false,
					hash: false,
					canvasContextAttributes: {
						antialias: true,
						alpha: true,
						powerPreference: 'high-performance',
						preserveDrawingBuffer: false,
						failIfMajorPerformanceCaveat: false
					}
				});
				map = instance;
				if (import.meta.env.DEV) {
					(window as unknown as { __zurichMap?: typeof instance }).__zurichMap = instance;
				}
				// Wheel without ctrl is intercepted by the page shell (credits scroll).
				// Ctrl/meta wheel (trackpad pinch) still reaches MapLibre scrollZoom.
				// Disable two-finger pitch so vertical two-finger drags can scroll to credits.
				instance.touchPitch.disable();
				instance.addControl(
					new maplibregl.AttributionControl({ compact: true }),
					'bottom-right'
				);
				instance.addControl(
					new maplibregl.NavigationControl({ visualizePitch: true }),
					'bottom-right'
				);
				instance.on('load', () => {
					styleReady = true;
					ensureLayers(instance);
					lastAppliedMode = mode;
					applyMode(mode, false);
					// Push overlay data again on idle so markers aren't blank until a layer click.
					instance.once('idle', () => {
						refreshOverlaySources(instance);
						registerPlaceIcons(instance);
						ensureBaseIconAtlas(instance);
						instance.triggerRepaint();
					});
					void (async () => {
						if (!terrainHandle) {
							terrainHandle = await attachSwissTerrain(instance, maplibregl);
						}
						mountSwissOverlay(instance, maplibregl);
						refreshOverlaySources(instance);
						instance.triggerRepaint();
					})();
					// Let the first frame paint on the dark canvas before lifting the splash.
					requestAnimationFrame(() => {
						dispatch('ready');
					});
				});
				attachIconAtlasResolver(instance);
				ensureBaseIconAtlas(instance);
				instance.on('style.load', () => {
					styleReady = true;
					attachIconAtlasResolver(instance);
					ensureBaseIconAtlas(instance);
					ensureLayers(instance);
					instance.once('idle', () => refreshOverlaySources(instance));
					void (async () => {
						terrainHandle?.unregister?.();
						terrainHandle = await attachSwissTerrain(instance, maplibregl);
						mountSwissOverlay(instance, maplibregl);
						refreshOverlaySources(instance);
					})();
				});
				for (const layer of [
					'places-core',
					'flights-core',
					'cameras-core',
					'quakes-core'
				]) {
					instance.on('click', layer, onClick);
					instance.on('mouseenter', layer, () => {
						instance.getCanvas().style.cursor = 'pointer';
					});
					instance.on('mouseleave', layer, () => {
						instance.getCanvas().style.cursor = '';
					});
				}
				resizeObserver = new ResizeObserver(() => instance.resize());
				resizeObserver.observe(container);
			} catch {
				mapError = 'The 3D city map could not load. Check your connection and try again.';
				dispatch('error');
			}
		}
		boot();
		const down = (event: KeyboardEvent) => {
			const key = event.key.toLowerCase();
			if (
				[
					'w',
					'a',
					's',
					'd',
					'q',
					'e',
					'arrowup',
					'arrowdown',
					'arrowleft',
					'arrowright',
					'shift'
				].includes(key)
			) {
				keys.add(key);
				if (mode === 'walk') {
					event.preventDefault();
					if (!raf) raf = requestAnimationFrame(stepWalk);
				}
			}
		};
		const up = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
		window.addEventListener('keydown', down);
		window.addEventListener('keyup', up);
		return () => {
			window.removeEventListener('keydown', down);
			window.removeEventListener('keyup', up);
			resizeObserver?.disconnect();
		};
	});

	onDestroy(() => {
		disposed = true;
		if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
		userMarker?.remove();
		terrainHandle?.unregister?.();
		terrainHandle = undefined;
		map?.remove();
		map = undefined;
	});

	export function flyHome() {
		lastAppliedMode = 'orbit';
		applyMode('orbit', true);
	}

	export function flyTo(lon: number, lat: number, zoom = 16.8) {
		map?.easeTo({
			center: [lon, lat],
			zoom,
			pitch: mode === 'walk' ? 72 : 60,
			duration: 1000
		});
	}

	export function trackFlight(flight: Flight) {
		map?.easeTo({
			center: [flight.lon, flight.lat],
			zoom: 12.2,
			pitch: 60,
			bearing: flight.heading ?? -20,
			duration: 1400
		});
	}

	/** Prefer airborne contacts — parked airport traffic is a dense yellow blob. */
	function airborneFlights(list: Flight[]) {
		const air = list.filter(
			(f) => !f.onGround && (f.altitudeFt == null || f.altitudeFt > 200)
		);
		return air.length ? air : list;
	}

	/** Zoom out to show live ADS-B contacts — most sit outside the city bowl. Explicit UX only. */
	export function fitFlights(list: Flight[] = flights) {
		if (!map || list.length === 0) return;
		const targets = airborneFlights(list);
		const lons = targets.map((f) => f.lon);
		const lats = targets.map((f) => f.lat);
		map.fitBounds(
			[
				[Math.min(...lons), Math.min(...lats)],
				[Math.max(...lons), Math.max(...lats)]
			],
			{ padding: 80, maxZoom: 12.8, duration: 1400, pitch: 48, essential: true }
		);
	}

	/** Kept for callers that used to auto-frame aircraft — no longer moves the camera. */
	export function revealFlightsIfNeeded(_list: Flight[] = flights) {
		return false;
	}
</script>

{#if mapError}
	<p class="map-error" role="alert">{mapError}</p>
{/if}
<div
	class="city-map"
	bind:this={container}
	role="application"
	aria-label="Walkable 3D map of Zürich"
></div>

<style>
	.city-map {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		background: #07131f;
	}
	.city-map :global(.maplibregl-canvas-container),
	.city-map :global(.maplibregl-canvas) {
		background: #07131f;
	}
	.map-error {
		position: absolute;
		z-index: 5;
		left: 16px;
		right: 16px;
		top: 88px;
		padding: 14px 16px;
		border-radius: 12px;
		background: #ffedf0;
		color: #b42332;
		border: 1px solid #f4ced3;
		font-size: 13px;
	}
	:global(.user-pulse) {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #1260ce;
		border: 3px solid #fff;
		box-shadow: 0 0 0 0 #1260ce88;
		animation: pulse 1.8s ease-out infinite;
	}
	@keyframes pulse {
		70% {
			box-shadow: 0 0 0 14px #1260ce00;
		}
		100% {
			box-shadow: 0 0 0 0 #1260ce00;
		}
	}
	:global(.maplibregl-ctrl-bottom-right) {
		margin: 0 12px 18px 0;
	}
	:global(.maplibregl-ctrl-attrib) {
		font-size: 10px;
		background: #ffffffcc !important;
	}
</style>
