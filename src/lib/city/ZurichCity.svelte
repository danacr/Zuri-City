<script lang="ts">
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import type { Map as MapLibreMap, GeoJSONSource, Marker } from 'maplibre-gl';
	import {
		CATEGORY_COLOR,
		ZURICH_CENTER,
		placesToGeoJSON,
		type Place,
		type PlaceCategory
	} from './places';
	import { availability, parkingTone, spotCount, type Parking } from '$lib/parking';

	export let places: Place[];
	export let parkings: Parking[] = [];
	export let layers: Record<PlaceCategory | 'parking', boolean>;
	export let mode: 'orbit' | 'walk' = 'orbit';
	export let selectedId: string | null = null;
	export let userPosition: [number, number] | null = null;

	const dispatch = createEventDispatcher<{
		select: { id: string; kind: 'place' | 'parking' };
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
			mapInstance.addSource('places', {
				type: 'geojson',
				data: placesToGeoJSON(visiblePlaces)
			});
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
			mapInstance.addSource('parking', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
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

		if (!mapInstance.getLayer('zurich-3d-buildings') && mapInstance.getSource('openmaptiles')) {
			mapInstance.addLayer({
				id: 'zurich-3d-buildings',
				source: 'openmaptiles',
				'source-layer': 'building',
				type: 'fill-extrusion',
				minzoom: 14,
				filter: ['!=', ['get', 'hide_3d'], true],
				paint: {
					'fill-extrusion-color': [
						'interpolate',
						['linear'],
						['get', 'render_height'],
						0,
						'#d9e2ec',
						40,
						'#b7c7d6',
						80,
						'#8fa3b8',
						140,
						'#6d8299'
					],
					'fill-extrusion-height': [
						'interpolate',
						['linear'],
						['zoom'],
						14,
						0,
						14.5,
						['coalesce', ['get', 'render_height'], 12]
					],
					'fill-extrusion-base': [
						'case',
						['has', 'render_min_height'],
						['get', 'render_min_height'],
						0
					],
					'fill-extrusion-opacity': 0.88
				}
			});
		}
	}

	function onClick(event: {
		features?: { properties?: Record<string, unknown>; layer?: { id?: string } }[];
	}) {
		const feature = event.features?.[0];
		const id = feature?.properties?.id;
		if (id == null) return;
		const layerId = feature?.layer?.id || '';
		dispatch('select', {
			id: String(id),
			kind: layerId.startsWith('parking') ? 'parking' : 'place'
		});
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
				if (disposed) return;
				const instance = new maplibregl.Map({
					container,
					style: 'https://tiles.openfreemap.org/styles/liberty',
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
					ensureLayers(instance);
					applyMode(mode, false);
					dispatch('ready');
				});
				instance.on('style.load', () => {
					ensureLayers(instance);
				});
				instance.on('click', 'places-core', onClick);
				instance.on('click', 'places-glow', onClick);
				instance.on('click', 'parking-pill', onClick);
				instance.on('mouseenter', 'places-core', () => {
					instance.getCanvas().style.cursor = 'pointer';
				});
				instance.on('mouseleave', 'places-core', () => {
					instance.getCanvas().style.cursor = '';
				});
				instance.on('mouseenter', 'parking-pill', () => {
					instance.getCanvas().style.cursor = 'pointer';
				});
				instance.on('mouseleave', 'parking-pill', () => {
					instance.getCanvas().style.cursor = '';
				});
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
				['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(
					key
				)
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
		cancelAnimationFrame(raf);
		userMarker?.remove();
		map?.remove();
		map = undefined;
	});

	export function flyHome() {
		applyMode(mode, true);
	}

	export function flyTo(lon: number, lat: number, zoom = 16.8) {
		map?.easeTo({ center: [lon, lat], zoom, pitch: mode === 'walk' ? 72 : 60, duration: 1000 });
	}
</script>

{#if mapError}
	<p class="map-error" role="alert">{mapError}</p>
{/if}
<div class="city-map" bind:this={container} role="application" aria-label="Walkable 3D map of Zürich"></div>

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
