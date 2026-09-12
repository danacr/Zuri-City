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
		quakesToGeoJSON,
		trafficToGeoJSON
	} from '$lib/intel/geo';
	import type { Camera, Flight, IntelLayer, Quake, TrafficSegment } from '$lib/intel/types';
	import { zurichAerialStyle } from '$lib/map/aerialStyle';

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
	export let traffic: TrafficSegment[] = [];
	export let quakes: Quake[] = [];
	export let mode: 'orbit' | 'walk' = 'orbit';
	export let selectedId: string | null = null;
	export let userPosition: [number, number] | null = null;

	const dispatch = createEventDispatcher<{
		select: { id: string; kind: 'place' | 'parking' | 'flight' | 'camera' | 'quake' };
		ready: void;
	}>();

	let container: HTMLDivElement;
	let map: MapLibreMap | undefined;
	let disposed = false;
	let mapError = '';
	let userMarker: Marker | undefined;
	let keys = new Set<string>();
	let raf = 0;
	let walkBearing = -20;

	$: visiblePlaces = places.filter((place) => layers[place.category]);
	$: visibleParkings = layers.parking
		? parkings.filter((parking) => parking.coordinates !== null)
		: [];
	$: visibleFlights = intelLayers.flights ? flights : [];
	$: visibleCameras = intelLayers.cameras ? cameras : [];
	$: visibleTraffic = intelLayers.traffic ? traffic : [];
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
	$: if (map?.getSource('flights')) {
		(map.getSource('flights') as GeoJSONSource).setData(flightsToGeoJSON(visibleFlights));
	}
	$: if (map?.getSource('cameras')) {
		(map.getSource('cameras') as GeoJSONSource).setData(camerasToGeoJSON(visibleCameras));
	}
	$: if (map?.getSource('viewsheds')) {
		(map.getSource('viewsheds') as GeoJSONSource).setData(cameraViewshedsGeoJSON(visibleCameras));
	}
	$: if (map?.getSource('traffic')) {
		(map.getSource('traffic') as GeoJSONSource).setData(trafficToGeoJSON(visibleTraffic));
	}
	$: if (map?.getSource('quakes')) {
		(map.getSource('quakes') as GeoJSONSource).setData(quakesToGeoJSON(visibleQuakes));
	}
	$: if (map) {
		const opacity = intelLayers.detection ? 0.95 : 0;
		if (map.getLayer('detection-flights')) {
			map.setPaintProperty('detection-flights', 'circle-stroke-opacity', opacity);
		}
	}
	$: if (map && mode) applyMode(mode, false);
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
					'circle-color': [
						'match',
						['get', 'tone'],
						'green',
						'#14775b',
						'red',
						'#b42332',
						'#627189'
					],
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

		// Traffic is added last (below) so it paints above 3D buildings.

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
			if (!mapInstance.hasImage('aircraft-icon')) {
				const size = 64;
				const canvas = document.createElement('canvas');
				canvas.width = size;
				canvas.height = size;
				const ctx = canvas.getContext('2d');
				if (ctx) {
					ctx.clearRect(0, 0, size, size);
					ctx.translate(size / 2, size / 2);
					ctx.fillStyle = '#f0b429';
					ctx.strokeStyle = '#1a1303';
					ctx.lineWidth = 3;
					ctx.beginPath();
					ctx.moveTo(0, -22);
					ctx.lineTo(14, 18);
					ctx.lineTo(0, 10);
					ctx.lineTo(-14, 18);
					ctx.closePath();
					ctx.fill();
					ctx.stroke();
					mapInstance.addImage('aircraft-icon', ctx.getImageData(0, 0, size, size), {
						pixelRatio: 2
					});
				}
			}
			mapInstance.addLayer({
				id: 'detection-flights',
				type: 'circle',
				source: 'flights',
				paint: {
					'circle-radius': 18,
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
					'icon-image': 'aircraft-icon',
					'icon-size': 0.85,
					'icon-rotate': ['coalesce', ['get', 'heading'], 0],
					'icon-rotation-alignment': 'map',
					'icon-allow-overlap': true,
					'icon-ignore-placement': true,
					'text-field': ['get', 'callsign'],
					'text-size': 11,
					'text-offset': [0, 1.55],
					'text-font': ['Noto Sans Bold'],
					'text-allow-overlap': true,
					'text-ignore-placement': true
				},
				paint: {
					'text-color': '#ffe8a3',
					'text-halo-color': '#1a1303',
					'text-halo-width': 1.6
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
					'circle-color': '#e03131',
					'circle-opacity': 0.35,
					'circle-stroke-width': 2,
					'circle-stroke-color': '#ff8787'
				}
			});
		}

		// Traffic above 3D building extrusions (aerial style already includes buildings).
		if (!mapInstance.getSource('traffic')) {
			mapInstance.addSource('traffic', {
				type: 'geojson',
				data: trafficToGeoJSON(visibleTraffic)
			});
			mapInstance.addLayer({
				id: 'traffic-case',
				type: 'line',
				source: 'traffic',
				paint: {
					'line-color': '#0b1724',
					'line-width': 10,
					'line-opacity': 0.45,
					'line-blur': 0.2
				},
				layout: { 'line-cap': 'round', 'line-join': 'round' }
			});
			mapInstance.addLayer({
				id: 'traffic-line',
				type: 'line',
				source: 'traffic',
				paint: {
					'line-color': ['get', 'color'],
					'line-width': 6,
					'line-opacity': 0.95
				},
				layout: { 'line-cap': 'round', 'line-join': 'round' }
			});
			mapInstance.addLayer({
				id: 'traffic-label',
				type: 'symbol',
				source: 'traffic',
				minzoom: 13,
				layout: {
					'symbol-placement': 'line-center',
					'text-field': ['get', 'name'],
					'text-size': 11,
					'text-font': ['Noto Sans Bold'],
					'text-allow-overlap': false
				},
				paint: {
					'text-color': '#fff4e5',
					'text-halo-color': '#1a0f08',
					'text-halo-width': 1.4
				}
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
					if (instance.getSource('terrain')) {
						instance.setTerrain({ source: 'terrain', exaggeration: 1.15 });
					}
					ensureLayers(instance);
					applyMode(mode, false);
					dispatch('ready');
				});
				instance.on('style.load', () => {
					if (instance.getSource('terrain')) {
						instance.setTerrain({ source: 'terrain', exaggeration: 1.15 });
					}
					ensureLayers(instance);
				});
				for (const layer of [
					'places-core',
					'places-glow',
					'parking-pill',
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

	/** Zoom out to show live ADS-B contacts — most sit outside the city bowl. */
	export function fitFlights(list: Flight[] = flights) {
		if (!map || list.length === 0) return;
		const lons = list.map((f) => f.lon);
		const lats = list.map((f) => f.lat);
		map.fitBounds(
			[
				[Math.min(...lons), Math.min(...lats)],
				[Math.max(...lons), Math.max(...lats)]
			],
			{ padding: 72, maxZoom: 11.8, duration: 1400, pitch: 50 }
		);
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
