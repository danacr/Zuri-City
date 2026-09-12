<script lang="ts">
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import type { GeoJSONSource, Map as MapLibreMap, Marker } from 'maplibre-gl';
	import {
		CATEGORY_COLOR,
		ZURICH_CENTER,
		placesToGeoJSON,
		type Place,
		type PlaceCategory
	} from './places';
	import { availability, parkingTone, spotCount, type Parking } from '$lib/parking';
	import {
		cameraViewshedsGeoJSON,
		camerasToGeoJSON,
		flightsToGeoJSON,
		quakesToGeoJSON
	} from '$lib/intel/geo';
	import type { Camera, Flight, IntelLayer, Quake } from '$lib/intel/types';
	import {
		aircraftIconId,
		drawAircraftIcon,
		GENERIC_FAMILY_ICON_IDS,
		genericPaint,
		paintFromFlight,
		type AircraftFamily
	} from '$lib/intel/aircraftIcons';
	import { TRAFFIC_STYLE_LAYERS, zurichAerialStyle } from '$lib/map/aerialStyle';
	import {
		advanceCars,
		CAR_ICON_IDS,
		carsToGeoJSON,
		drawCarIcon,
		spawnCarsFromRoadFeatures,
		type Congestion,
		type SimCar
	} from '$lib/city/trafficCars';

	export let places: Place[];
	export let parkings: Parking[] = [];
	export let layers: Record<PlaceCategory | 'parking', boolean>;
	export let intelLayers: Record<IntelLayer, boolean> = {
		flights: true,
		cameras: true,
		traffic: true,
		quakes: false,
		detection: true
	};
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
	let trafficCars: SimCar[] = [];
	let trafficRaf = 0;
	let lastTrafficTs = 0;
	let lastTrafficReseed = 0;

	$: visiblePlaces = places.filter((place) => layers[place.category]);
	$: visibleParkings = parkings.filter((parking) => parking.coordinates !== null);
	$: visibleFlights = intelLayers.flights ? flights : [];
	$: visibleCameras = intelLayers.cameras ? cameras : [];
	$: visibleQuakes = intelLayers.quakes ? quakes : [];

	$: if (map?.getSource('places')) {
		(map.getSource('places') as GeoJSONSource).setData(placesToGeoJSON(visiblePlaces));
	}
	$: if (map?.getSource('parking')) {
		(map.getSource('parking') as GeoJSONSource).setData({
			type: 'FeatureCollection',
			features: visibleParkings.map((parking) => ({
				type: 'Feature' as const,
				id: parking.id || parking.name,
				properties: {
					id: parking.id || parking.name,
					name: parking.name,
					label: spotCount(parking),
					state: availability(parking),
					tone: parkingTone(parking)
				},
				geometry: {
					type: 'Point' as const,
					coordinates: [parking.coordinates![1], parking.coordinates![0]]
				}
			}))
		});
	}
	let didAutoRevealFlights = false;

	$: if (map?.getSource('flights')) {
		registerAircraftIcons(map, visibleFlights);
		(map.getSource('flights') as GeoJSONSource).setData(flightsToGeoJSON(visibleFlights));
	}
	$: if (map && styleReady && intelLayers.flights && visibleFlights.length && !didAutoRevealFlights) {
		// Default city zoom almost never includes airborne ADS-B contacts — frame them once.
		const snapshot = visibleFlights;
		setTimeout(() => {
			if (didAutoRevealFlights || !map) return;
			didAutoRevealFlights = revealFlightsIfNeeded(snapshot);
		}, 600);
	}
	$: if (map?.getSource('cameras')) {
		(map.getSource('cameras') as GeoJSONSource).setData(camerasToGeoJSON(visibleCameras));
	}
	$: if (map?.getSource('viewsheds')) {
		(map.getSource('viewsheds') as GeoJSONSource).setData(cameraViewshedsGeoJSON(visibleCameras));
	}
	$: if (map?.getSource('quakes')) {
		(map.getSource('quakes') as GeoJSONSource).setData(quakesToGeoJSON(visibleQuakes));
	}
	$: if (map && styleReady) {
		const opacity = intelLayers.detection ? 0.95 : 0;
		if (map.getLayer('detection-flights')) {
			map.setPaintProperty('detection-flights', 'circle-stroke-opacity', opacity);
		}
		syncTrafficVisibility(map, intelLayers.traffic);
		if (intelLayers.traffic) {
			ensureTrafficCarsLayer(map);
			startTrafficLoop();
		} else {
			stopTrafficLoop();
		}
	}
	let lastAppliedMode: 'orbit' | 'walk' | null = null;
	$: if (map && mode && mode !== lastAppliedMode) {
		lastAppliedMode = mode;
		applyMode(mode, false);
	}
	$: if (map && selectedId) focusSelection(selectedId);
	$: if (map && userPosition) syncUserMarker(userPosition);

	function applyMode(next: 'orbit' | 'walk', animate = true) {
		if (!map) return;
		const camera =
			next === 'walk'
				? { zoom: 17.4, pitch: 72, bearing: walkBearing, center: map.getCenter() }
				: { zoom: 14.6, pitch: 58, bearing: -18, center: ZURICH_CENTER };
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
				zoom: 12.5,
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

	function ensureLayers(mapInstance: MapLibreMap) {
		if (!mapInstance.getSource('places')) {
			mapInstance.addSource('places', { type: 'geojson', data: placesToGeoJSON(visiblePlaces) });
			mapInstance.addLayer({
				id: 'places-glow',
				type: 'circle',
				source: 'places',
				paint: {
					'circle-radius': 14,
					'circle-color': [
						'match',
						['get', 'category'],
						'attraction',
						CATEGORY_COLOR.attraction,
						'restaurant',
						CATEGORY_COLOR.restaurant,
						CATEGORY_COLOR.shop
					],
					'circle-opacity': 0.22,
					'circle-blur': 0.6
				}
			});
			mapInstance.addLayer({
				id: 'places-core',
				type: 'circle',
				source: 'places',
				paint: {
					'circle-radius': 6.5,
					'circle-color': [
						'match',
						['get', 'category'],
						'attraction',
						CATEGORY_COLOR.attraction,
						'restaurant',
						CATEGORY_COLOR.restaurant,
						CATEGORY_COLOR.shop
					],
					'circle-stroke-width': 2,
					'circle-stroke-color': '#ffffff'
				}
			});
			mapInstance.addLayer({
				id: 'places-label',
				type: 'symbol',
				source: 'places',
				layout: {
					'text-field': ['get', 'name'],
					'text-size': 11,
					'text-offset': [0, 1.35],
					'text-font': ['Noto Sans Regular'],
					'text-max-width': 10
				},
				paint: {
					'text-color': '#16304e',
					'text-halo-color': '#ffffff',
					'text-halo-width': 1.4
				}
			});
		}

		if (!mapInstance.getSource('parking')) {
			mapInstance.addSource('parking', {
				type: 'geojson',
				data: { type: 'FeatureCollection', features: [] }
			});
			mapInstance.addLayer({
				id: 'parking-pill',
				type: 'circle',
				source: 'parking',
				paint: {
					'circle-radius': 11,
					'circle-color': '#1c7ed6',
					'circle-stroke-width': 2,
					'circle-stroke-color': '#ffffff'
				}
			});
			mapInstance.addLayer({
				id: 'parking-label',
				type: 'symbol',
				source: 'parking',
				layout: {
					'text-field': ['get', 'label'],
					'text-size': 10,
					'text-offset': [0, 1.4],
					'text-font': ['Noto Sans Bold']
				},
				paint: {
					'text-color': '#16304e',
					'text-halo-color': '#ffffff',
					'text-halo-width': 1.2
				}
			});
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
			registerAircraftIcons(mapInstance);
			// Always-on halo so contacts read even when sprites are tiny / off-screen zoom.
			mapInstance.addLayer({
				id: 'flights-halo',
				type: 'circle',
				source: 'flights',
				paint: {
					'circle-radius': [
						'interpolate',
						['linear'],
						['zoom'],
						8,
						3,
						11,
						5,
						14,
						8
					],
					'circle-color': '#f0b429',
					'circle-opacity': 0.55,
					'circle-stroke-width': 1.5,
					'circle-stroke-color': '#fff6d6',
					'circle-stroke-opacity': 0.9
				}
			});
			mapInstance.addLayer({
				id: 'detection-flights',
				type: 'circle',
				source: 'flights',
				paint: {
					'circle-radius': [
						'match',
						['get', 'size'],
						'light',
						14,
						'medium',
						18,
						'heavy',
						24,
						'rotor',
						16,
						18
					],
					'circle-color': '#3dd68c',
					'circle-opacity': 0,
					'circle-stroke-width': 2,
					'circle-stroke-color': '#3dd68c',
					'circle-stroke-opacity': intelLayers.detection ? 0.95 : 0
				}
			});
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

		// Living streets: fake cars on OSM centerlines (foundation of the city view).
		ensureTrafficCarsLayer(mapInstance);
		syncTrafficVisibility(mapInstance, intelLayers.traffic);
		if (intelLayers.traffic) {
			reseedTrafficCars(true);
			startTrafficLoop();
		}
	}

	function imageDataForMap(image: ImageData): {
		width: number;
		height: number;
		data: Uint8Array;
	} {
		// MapLibre 6 is picky about ImageData — pass a plain StyleImageInterface.
		return {
			width: image.width,
			height: image.height,
			data: new Uint8Array(image.data)
		};
	}

	function addAircraftImage(
		mapInstance: MapLibreMap,
		id: string,
		paint: Parameters<typeof drawAircraftIcon>[0]
	) {
		if (mapInstance.hasImage(id)) return;
		const image = drawAircraftIcon(paint, 160);
		if (!image) return;
		try {
			mapInstance.addImage(id, imageDataForMap(image), { pixelRatio: 2 });
		} catch (error) {
			console.warn('aircraft icon add failed', id, error);
		}
	}

	function registerAircraftIcons(mapInstance: MapLibreMap, list: Flight[] = visibleFlights) {
		if (!mapInstance.isStyleLoaded()) return;
		const families = Object.keys(GENERIC_FAMILY_ICON_IDS) as AircraftFamily[];
		for (const family of families) {
			addAircraftImage(mapInstance, GENERIC_FAMILY_ICON_IDS[family], genericPaint(family));
		}
		for (const flight of list) {
			const paint = paintFromFlight({
				callsign: flight.callsign,
				typeCode: flight.typeCode,
				size: flight.size
			});
			addAircraftImage(mapInstance, aircraftIconId(paint), paint);
		}
	}

	function ensureAircraftIconFromId(mapInstance: MapLibreMap, id: string) {
		if (!id.startsWith('plane-') || mapInstance.hasImage(id)) return;
		const parts = id.split('-');
		// plane-{family}-{airline} — family may be wide-twin / wide-quad (two tokens).
		let family: AircraftFamily = 'narrow';
		let airline = 'gen';
		if (parts[1] === 'wide' && (parts[2] === 'twin' || parts[2] === 'quad')) {
			family = parts[2] === 'twin' ? 'wide-twin' : 'wide-quad';
			airline = parts[3] || 'gen';
		} else if (
			parts[1] === 'ga' ||
			parts[1] === 'regional' ||
			parts[1] === 'narrow' ||
			parts[1] === 'rotor'
		) {
			family = parts[1];
			airline = parts[2] || 'gen';
		}
		const livery =
			airline !== 'gen'
				? paintFromFlight({ callsign: airline.toUpperCase() + '1' }).livery
				: null;
		addAircraftImage(mapInstance, id, {
			family,
			livery,
			size:
				family === 'ga'
					? 'light'
					: family === 'rotor'
						? 'rotor'
						: family.startsWith('wide')
							? 'heavy'
							: 'medium'
		});
	}

	function ensureTrafficCarsLayer(mapInstance: MapLibreMap) {
		if (!mapInstance.isStyleLoaded()) return;
		const congestions = Object.keys(CAR_ICON_IDS) as Congestion[];
		for (const congestion of congestions) {
			const id = CAR_ICON_IDS[congestion];
			if (mapInstance.hasImage(id)) continue;
			const sprite = drawCarIcon(congestion, 64);
			if (sprite) {
				try {
					mapInstance.addImage(id, imageDataForMap(sprite), { pixelRatio: 2 });
				} catch (error) {
					console.warn('car icon add failed', id, error);
				}
			}
		}
		if (!mapInstance.getSource('traffic-cars')) {
			mapInstance.addSource('traffic-cars', {
				type: 'geojson',
				data: { type: 'FeatureCollection', features: [] }
			});
		}
		if (!mapInstance.getLayer('traffic-cars')) {
			mapInstance.addLayer({
				id: 'traffic-cars',
				type: 'symbol',
				source: 'traffic-cars',
				minzoom: 15,
				layout: {
					'icon-image': ['coalesce', ['get', 'icon'], 'traffic-car-free'],
					'icon-size': [
						'interpolate',
						['linear'],
						['zoom'],
						15,
						0.22,
						16,
						0.34,
						18,
						0.55
					],
					'icon-rotate': ['get', 'bearing'],
					'icon-rotation-alignment': 'map',
					'icon-pitch-alignment': 'map',
					'icon-allow-overlap': true,
					'icon-ignore-placement': true,
					visibility: intelLayers.traffic ? 'visible' : 'none'
				}
			});
		}
	}

	function syncTrafficVisibility(mapInstance: MapLibreMap, on: boolean) {
		const visibility = on ? 'visible' : 'none';
		for (const id of TRAFFIC_STYLE_LAYERS) {
			if (mapInstance.getLayer(id)) {
				mapInstance.setLayoutProperty(id, 'visibility', visibility);
			}
		}
	}

	function pushCarsToMap() {
		if (!map?.getSource('traffic-cars')) return;
		(map.getSource('traffic-cars') as GeoJSONSource).setData(carsToGeoJSON(trafficCars));
	}

	function reseedTrafficCars(force = false) {
		if (!map || !intelLayers.traffic) return;
		const now = performance.now();
		if (!force && now - lastTrafficReseed < 2600) return;
		lastTrafficReseed = now;

		let features: GeoJSON.Feature[] = [];
		try {
			features = map.queryRenderedFeatures({ layers: ['traffic-roads-query'] }) as GeoJSON.Feature[];
		} catch {
			features = [];
		}

		if (features.length < 6) {
			try {
				features = map.querySourceFeatures('openmaptiles', {
					sourceLayer: 'transportation',
					filter: [
						'all',
						['==', ['geometry-type'], 'LineString'],
						[
							'in',
							['get', 'class'],
							['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary']]
						]
					]
				}) as GeoJSON.Feature[];
			} catch {
				features = [];
			}
		}

		const zoom = map.getZoom();
		trafficCars = spawnCarsFromRoadFeatures(features, {
			maxCars: zoom >= 16 ? 40 : zoom >= 15 ? 24 : 0
		});
		pushCarsToMap();
	}

	function startTrafficLoop() {
		if (trafficRaf || typeof requestAnimationFrame !== 'function') return;
		lastTrafficTs = performance.now();
		if (trafficCars.length === 0) reseedTrafficCars(true);
		const tick = (ts: number) => {
			trafficRaf = 0;
			if (!map || !intelLayers.traffic || disposed) return;
			const dt = Math.min(0.05, Math.max(0.012, (ts - lastTrafficTs) / 1000));
			lastTrafficTs = ts;
			if (trafficCars.length) {
				trafficCars = advanceCars(trafficCars, dt);
				pushCarsToMap();
			}
			trafficRaf = requestAnimationFrame(tick);
		};
		trafficRaf = requestAnimationFrame(tick);
	}

	function stopTrafficLoop() {
		if (trafficRaf) {
			cancelAnimationFrame(trafficRaf);
			trafficRaf = 0;
		}
		trafficCars = [];
		if (map?.getSource('traffic-cars')) {
			(map.getSource('traffic-cars') as GeoJSONSource).setData({
				type: 'FeatureCollection',
				features: []
			});
		}
	}

	function kindFromLayer(layerId: string) {
		if (layerId.startsWith('parking')) return 'parking' as const;
		if (layerId.startsWith('flights') || layerId === 'detection-flights') return 'flight' as const;
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
		if (!map || mode !== 'walk' || keys.size === 0) {
			raf = requestAnimationFrame(stepWalk);
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
					zoom: 14.8,
					pitch: 58,
					bearing: -18,
					maxPitch: 80,
					attributionControl: false,
					hash: false
				});
				map = instance;
				instance.addControl(
					new maplibregl.AttributionControl({ compact: true }),
					'bottom-right'
				);
				instance.addControl(
					new maplibregl.NavigationControl({ visualizePitch: true }),
					'bottom-right'
				);
				instance.on('load', () => {
					try {
						if (instance.getSource('terrain')) {
							instance.setTerrain({ source: 'terrain', exaggeration: 1.1 });
						}
					} catch {
						/* Terrain is optional — aerial + buildings still work. */
					}
					styleReady = true;
					ensureLayers(instance);
					lastAppliedMode = mode;
					applyMode(mode, false);
					dispatch('ready');
					// After the city camera is set, frame airborne traffic if none are in view.
					requestAnimationFrame(() => {
						if (!didAutoRevealFlights && intelLayers.flights && visibleFlights.length) {
							didAutoRevealFlights = revealFlightsIfNeeded(visibleFlights);
						}
					});
				});
				// MapLibre 6: prefer the resolver so missing airline sprites are generated in time.
				instance.setMissingStyleImageResolver((id) => {
					ensureAircraftIconFromId(instance, id);
				});
				instance.on('styleimagemissing', (event: { id: string }) => {
					ensureAircraftIconFromId(instance, event.id);
				});
				instance.on('style.load', () => {
					try {
						if (instance.getSource('terrain')) {
							instance.setTerrain({ source: 'terrain', exaggeration: 1.1 });
						}
					} catch {
						/* ignore */
					}
					styleReady = true;
					ensureLayers(instance);
				});
				const onViewportSettle = () => {
					if (intelLayers.traffic) reseedTrafficCars(false);
				};
				instance.on('moveend', onViewportSettle);
				instance.on('zoomend', onViewportSettle);
				for (const layer of [
					'places-core',
					'places-glow',
					'parking-pill',
					'flights-halo',
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
				raf = requestAnimationFrame(stepWalk);
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
				if (mode === 'walk') event.preventDefault();
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
		stopTrafficLoop();
		if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
		userMarker?.remove();
		map?.remove();
		map = undefined;
	});

	export function flyHome() {
		applyMode(mode, true);
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

	/** Zoom out to show live ADS-B contacts — most sit outside the city bowl. */
	export function fitFlights(list: Flight[] = flights) {
		if (!map || list.length === 0) return;
		didAutoRevealFlights = true;
		const targets = airborneFlights(list);
		const lons = targets.map((f) => f.lon);
		const lats = targets.map((f) => f.lat);
		map.fitBounds(
			[
				[Math.min(...lons), Math.min(...lats)],
				[Math.max(...lons), Math.max(...lats)]
			],
			{ padding: 80, maxZoom: 11.2, duration: 1400, pitch: 48, essential: true }
		);
	}

	/** If no contacts are in the current viewport, frame airborne traffic once. */
	export function revealFlightsIfNeeded(list: Flight[] = flights) {
		if (!map || !styleReady || list.length === 0 || !intelLayers.flights) return false;
		const bounds = map.getBounds();
		const inView = list.some(
			(f) =>
				!f.onGround &&
				bounds.contains([f.lon, f.lat])
		);
		if (inView) return false;
		fitFlights(list);
		return true;
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
