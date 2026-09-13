<script lang="ts">
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { type Place, type PlaceCategory } from './places';
	import { type Parking } from '$lib/parking';
	import type { Camera, Flight, IntelLayer, Quake } from '$lib/intel/types';
	import {
		CITY_MAX_ZOOM,
		CITY_MIN_ZOOM,
		ORBIT_CAMERA,
		WALK_CAMERA,
		ZURICH_LAT,
		ZURICH_LON
	} from '$lib/map/swissSources';
	import { createCesiumCity, type CesiumCityHandle } from '$lib/map/cesiumCity';
	import { flyCityCamera, heightToZoom } from '$lib/map/cesiumCamera';
	import {
		attachEntityClick,
		syncCameraEntities,
		syncFlightEntities,
		syncParkingEntities,
		syncPlaceEntities,
		syncQuakeEntities,
		syncTrafficEntities,
		syncUserEntity
	} from '$lib/map/layers/cesiumOverlays';
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
	let handle: CesiumCityHandle | undefined;
	let CesiumMod: typeof import('cesium') | undefined;
	let disposed = false;
	let mapError = '';
	let ready = false;
	let keys = new Set<string>();
	let walkRaf = 0;
	let walkBearing: number = ORBIT_CAMERA.bearing;
	let lastAppliedMode: 'orbit' | 'walk' | null = null;
	let clickHandler: { destroy: () => void } | undefined;
	let removeMoveEnd: (() => void) | undefined;

	$: visiblePlaces = places.filter((place) => layers[place.category]);
	$: visibleParkings = showParking
		? parkings.filter((parking) => parking.coordinates !== null)
		: [];
	$: visibleFlights = intelLayers.flights ? flights : [];
	$: visibleCameras = intelLayers.cameras ? cameras : [];
	$: visibleQuakes = intelLayers.quakes ? quakes : [];

	$: if (ready && handle && CesiumMod) syncPlaceEntities(handle.viewer, CesiumMod, visiblePlaces);
	$: if (ready && handle && CesiumMod)
		syncParkingEntities(handle.viewer, CesiumMod, visibleParkings, showParking);
	$: if (ready && handle && CesiumMod)
		syncFlightEntities(handle.viewer, CesiumMod, visibleFlights, intelLayers.flights);
	$: if (ready && handle && CesiumMod)
		syncCameraEntities(
			handle.viewer,
			CesiumMod,
			visibleCameras,
			intelLayers.cameras,
			Boolean(intelLayers.detection && intelLayers.cameras)
		);
	$: if (ready && handle && CesiumMod)
		syncQuakeEntities(handle.viewer, CesiumMod, visibleQuakes, intelLayers.quakes);
	$: if (ready && handle && CesiumMod)
		syncTrafficEntities(handle.viewer, CesiumMod, intelLayers.traffic);
	$: if (ready && handle && CesiumMod) syncUserEntity(handle.viewer, CesiumMod, userPosition);
	$: if (ready && handle && mode && mode !== lastAppliedMode) {
		lastAppliedMode = mode;
		void applyMode(mode, true);
	}
	$: if (ready && handle && selectedId) focusSelection(selectedId);

	async function applyMode(next: 'orbit' | 'walk', animate = true) {
		if (!handle) return;
		const carto = handle.viewer.camera.positionCartographic;
		const lon =
			next === 'orbit' ? ZURICH_LON : carto ? (carto.longitude * 180) / Math.PI : ZURICH_LON;
		const lat =
			next === 'orbit' ? ZURICH_LAT : carto ? (carto.latitude * 180) / Math.PI : ZURICH_LAT;
		const pose =
			next === 'walk'
				? { lon, lat, zoom: WALK_CAMERA.zoom, pitch: WALK_CAMERA.pitch, bearing: walkBearing }
				: {
						lon: ZURICH_LON,
						lat: ZURICH_LAT,
						zoom: ORBIT_CAMERA.zoom,
						pitch: ORBIT_CAMERA.pitch,
						bearing: ORBIT_CAMERA.bearing
					};
		await flyCityCamera(handle.viewer, pose, animate ? 1.4 : 0);
		handle.viewer.scene.requestRender();
	}

	function focusSelection(id: string) {
		if (!handle) return;
		const place = places.find((item) => item.id === id);
		if (place) {
			void flyCityCamera(
				handle.viewer,
				{
					lon: place.lon,
					lat: place.lat,
					zoom: Math.max(16.5, mode === 'walk' ? WALK_CAMERA.zoom : 16.5),
					pitch: mode === 'walk' ? 72 : 62,
					bearing: walkBearing
				},
				0.9
			);
			return;
		}
		const parking = parkings.find((item) => (item.id || item.name) === id);
		if (parking?.coordinates) {
			const [plat, plon] = parking.coordinates;
			void flyCityCamera(
				handle.viewer,
				{ lon: plon, lat: plat, zoom: 16, pitch: 60, bearing: walkBearing },
				0.9
			);
			return;
		}
		const flight = flights.find((item) => item.id === id);
		if (flight) {
			void flyCityCamera(
				handle.viewer,
				{
					lon: flight.lon,
					lat: flight.lat,
					zoom: Math.max(CITY_MIN_ZOOM, 12.5),
					pitch: 55,
					bearing: flight.heading ?? walkBearing
				},
				1.2
			);
			return;
		}
		const camera = cameras.find((item) => item.id === id);
		if (camera) {
			void flyCityCamera(
				handle.viewer,
				{ lon: camera.lon, lat: camera.lat, zoom: 16.8, pitch: 65, bearing: camera.bearing },
				1
			);
		}
	}

	function stopWalkLoop() {
		if (walkRaf) {
			cancelAnimationFrame(walkRaf);
			walkRaf = 0;
		}
	}

	function stepWalk() {
		walkRaf = 0;
		if (disposed || !handle || !CesiumMod || mode !== 'walk' || keys.size === 0) return;
		const camera = handle.viewer.camera;
		const carto = camera.positionCartographic;
		if (!carto) return;
		const zoom = heightToZoom(carto.height);
		const stepMeters = (zoom > 17 ? 2.2 : 4.5) * (keys.has('shift') ? 2.4 : 1);
		let heading = camera.heading;
		let dEast = 0;
		let dNorth = 0;
		if (keys.has('w') || keys.has('arrowup')) dNorth += stepMeters;
		if (keys.has('s') || keys.has('arrowdown')) dNorth -= stepMeters;
		if (keys.has('a') || keys.has('arrowleft')) dEast -= stepMeters;
		if (keys.has('d') || keys.has('arrowright')) dEast += stepMeters;
		if (keys.has('q')) heading -= CesiumMod.Math.toRadians(1.6);
		if (keys.has('e')) heading += CesiumMod.Math.toRadians(1.6);
		walkBearing = CesiumMod.Math.toDegrees(heading);

		const sin = Math.sin(heading);
		const cos = Math.cos(heading);
		const moveX = dEast * cos - dNorth * sin;
		const moveY = dEast * sin + dNorth * cos;
		const lon =
			CesiumMod.Math.toDegrees(carto.longitude) + moveX / (111320 * Math.cos(carto.latitude));
		const lat = CesiumMod.Math.toDegrees(carto.latitude) + moveY / 111320;

		camera.setView({
			destination: CesiumMod.Cartesian3.fromDegrees(lon, lat, carto.height),
			orientation: { heading, pitch: camera.pitch, roll: 0 }
		});
		handle.viewer.scene.requestRender();
		if (keys.size > 0) walkRaf = requestAnimationFrame(stepWalk);
	}

	function ensureWalkLoop() {
		if (mode === 'walk' && keys.size > 0 && !walkRaf) walkRaf = requestAnimationFrame(stepWalk);
	}

	onMount(() => {
		let resizeObserver: ResizeObserver | undefined;

		async function boot() {
			try {
				// Must be set before Cesium evaluates worker URLs.
				(window as unknown as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = '/cesiumStatic/';
				handle = await createCesiumCity(container);
				CesiumMod = await import('cesium');
				if (disposed) {
					handle.destroy();
					handle = undefined;
					return;
				}

				clickHandler = attachEntityClick(handle.viewer, CesiumMod, ({ kind, id }) => {
					dispatch('select', { id, kind });
				});

				const onMoveEnd = () => handle?.viewer.scene.requestRender();
				handle.viewer.camera.moveEnd.addEventListener(onMoveEnd);
				removeMoveEnd = () => handle?.viewer.camera.moveEnd.removeEventListener(onMoveEnd);

				resizeObserver = new ResizeObserver(() => {
					handle?.viewer.resize();
					handle?.viewer.scene.requestRender();
				});
				resizeObserver.observe(container);

				ready = true;
				lastAppliedMode = mode;
				await applyMode(mode, false);
				requestAnimationFrame(() => dispatch('ready'));
			} catch (error) {
				console.error(error);
				mapError = 'The 3D city map could not load. Check your connection and try again.';
				dispatch('error');
			}
		}

		void boot();

		const down = (event: KeyboardEvent) => {
			const key = event.key.toLowerCase();
			if (
				['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(
					key
				)
			) {
				keys.add(key);
				if (mode === 'walk') {
					event.preventDefault();
					ensureWalkLoop();
				}
			}
		};
		const up = (event: KeyboardEvent) => {
			keys.delete(event.key.toLowerCase());
			if (keys.size === 0) stopWalkLoop();
		};
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
		stopWalkLoop();
		removeMoveEnd?.();
		clickHandler?.destroy();
		handle?.destroy();
		handle = undefined;
	});

	export async function flyHome() {
		lastAppliedMode = 'orbit';
		await applyMode('orbit', true);
	}

	export async function flyTo(lon: number, lat: number, zoom = 16.8) {
		if (!handle) return;
		await flyCityCamera(
			handle.viewer,
			{
				lon,
				lat,
				zoom: Math.min(CITY_MAX_ZOOM, Math.max(CITY_MIN_ZOOM, zoom)),
				pitch: mode === 'walk' ? 72 : 60,
				bearing: walkBearing
			},
			1
		);
	}

	export async function trackFlight(flight: Flight) {
		if (!handle) return;
		await flyCityCamera(
			handle.viewer,
			{
				lon: flight.lon,
				lat: flight.lat,
				zoom: 12.2,
				pitch: 60,
				bearing: flight.heading ?? -20
			},
			1.4
		);
	}

	export async function fitFlights(list: Flight[] = flights) {
		if (!handle || !CesiumMod || list.length === 0) return;
		const air = list.filter((f) => !f.onGround && (f.altitudeFt == null || f.altitudeFt > 200));
		const targets = air.length ? air : list;
		const lons = targets.map((f) => f.lon);
		const lats = targets.map((f) => f.lat);
		const rectangle = CesiumMod.Rectangle.fromDegrees(
			Math.min(...lons),
			Math.min(...lats),
			Math.max(...lons),
			Math.max(...lats)
		);
		await new Promise<void>((resolve) => {
			handle!.viewer.camera.flyTo({
				destination: rectangle,
				duration: 1.4,
				complete: () => resolve(),
				cancel: () => resolve()
			});
		});
		handle.viewer.scene.requestRender();
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
	.city-map :global(.cesium-viewer),
	.city-map :global(.cesium-viewer-cesiumWidgetContainer),
	.city-map :global(.cesium-widget),
	.city-map :global(.cesium-widget canvas) {
		width: 100%;
		height: 100%;
		background: #07131f;
	}
	.city-map :global(.cesium-viewer-bottom),
	.city-map :global(.cesium-viewer-toolbar),
	.city-map :global(.cesium-viewer-animationContainer),
	.city-map :global(.cesium-viewer-timelineContainer),
	.city-map :global(.cesium-credit-logoContainer),
	.city-map :global(.cesium-credit-textContainer) {
		display: none !important;
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
</style>
