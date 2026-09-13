<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import InstallApp from '$lib/InstallApp.svelte';
	import ZurichCity from '$lib/city/ZurichCity.svelte';
	import ZurichBootSplash from '$lib/city/ZurichBootSplash.svelte';
	import LayersPanel from '$lib/city/LayersPanel.svelte';
	import ContactViewer from '$lib/intel/ContactViewer.svelte';
	import { attachMapShellGestures } from '$lib/city/mapShellGestures';
	import {
		CATEGORY_LABEL,
		PLACE_CATEGORIES,
		ZURICH_CENTER,
		haversineMeters,
		type Place,
		type PlaceCategory
	} from '$lib/city/places';
	import {
		createDefaultIntelLayers,
		createDefaultPlaceLayers,
		INTEL_LAYER_IDS,
		PARKING_LAYER,
		setAllPlaceLayers,
		type LayerCounts
	} from '$lib/city/layerRegistry';
	import { placeIconDataUrl } from '$lib/city/placeIcons';
	import { type Parking } from '$lib/parking';
	import {
		SENSOR_LOOKS,
		type Camera,
		type Flight,
		type IntelLayer,
		type SensorLook,
		type Quake
	} from '$lib/intel/types';
	import type { PageData } from '../../routes/$types';

	export let data: PageData;

	let mode: 'orbit' | 'walk' = 'orbit';
	/** Mobile starts map-first; open the sheet from the Layers control when needed. */
	let layersOpen = false;
	let selected: Place | Flight | Camera | null = null;
	let selectedKind: 'place' | 'flight' | 'camera' | null = null;
	let city: ZurichCity;
	let position: [number, number] | null = null;
	let locating = false;
	let locationError = '';
	let request = 0;
	let layers: Record<PlaceCategory, boolean> = createDefaultPlaceLayers();
	let openNowOnly = false;
	let showParking = PARKING_LAYER.defaultVisible;
	let intelLayers: Record<IntelLayer, boolean> = createDefaultIntelLayers();
	let sensorLook: SensorLook = 'normal';
	/** Local copies so the shell can paint before streamed `hydrateCity` resolves. */
	let places: Place[] = data.places;
	let parkings: Parking[] = data.parkings;
	let placesError = data.placesError;
	let parkingError = data.error;
	let refreshedAt: string | null = data.refreshedAt;
	let flights: Flight[] = data.intel?.flights ?? [];
	let cameras: Camera[] = data.intel?.cameras ?? [];
	let quakes: Quake[] = data.intel?.quakes ?? [];
	let intelNotes: string[] = data.intel?.notes ?? [];
	let hydrateGen = 0;
	let pollTimer: ReturnType<typeof setInterval> | undefined;
	let categoryIcons: Partial<Record<PlaceCategory, string>> = {};
	const intelKeys: IntelLayer[] = INTEL_LAYER_IDS;
	let shellEl: HTMLElement | undefined;
	let footerEl: HTMLElement | undefined;
	let mapStageEl: HTMLElement | undefined;

	$: {
		places = data.places;
		parkings = data.parkings;
		placesError = data.placesError;
		parkingError = data.error;
		refreshedAt = data.refreshedAt;
		flights = data.intel?.flights ?? [];
		cameras = data.intel?.cameras ?? [];
		quakes = data.intel?.quakes ?? [];
		intelNotes = data.intel?.notes ?? [];
		if (!browser) break $;
		const gen = ++hydrateGen;
		void Promise.resolve(data.hydrateCity).then((live) => {
			if (gen !== hydrateGen || !live) return;
			// Merge-by-id so a sparse/failed Overpass response never blanks the map.
			if (live.places?.length) {
				const byId = new Map(places.map((place) => [place.id, place]));
				for (const place of live.places) byId.set(place.id, place);
				places = [...byId.values()];
			}
			if (live.parkings?.length) parkings = live.parkings;
			placesError = live.placesError;
			parkingError = live.error;
			refreshedAt = live.refreshedAt;
			flights = live.intel?.flights ?? [];
			cameras = live.intel?.cameras ?? [];
			quakes = live.intel?.quakes ?? [];
			intelNotes = live.intel?.notes ?? [];
			tryRevealFlights();
		});
	}

	$: placeOrigin = (position || ZURICH_CENTER) as [number, number];
	$: visibleMapPlaces = [...places]
		.filter((place) => layers[place.category] && (!openNowOnly || place.isOpen === true))
		.sort((a, b) => {
			const openScore = (value: boolean | null) => (value === true ? 0 : value === false ? 2 : 1);
			const openDiff = openScore(a.isOpen) - openScore(b.isOpen);
			if (openDiff !== 0) return openDiff;
			return (
				haversineMeters(placeOrigin, [a.lon, a.lat]) - haversineMeters(placeOrigin, [b.lon, b.lat])
			);
		});
	$: counts = {
		...(Object.fromEntries(
			PLACE_CATEGORIES.map((key) => [key, places.filter((p) => p.category === key).length])
		) as Record<PlaceCategory, number>),
		openNow: places.filter((p) => p.isOpen === true).length,
		parking: parkings.length,
		flights: flights.length,
		cameras: cameras.length,
		// Live streets: simulated cars on OpenMapTiles roads — no corridor count.
		traffic: intelLayers.traffic ? 'roads' : 0,
		quakes: quakes.length
	} satisfies LayerCounts;
	$: activePlaceCount = PLACE_CATEGORIES.filter((key) => layers[key]).length;
	$: activeFeedCount =
		(showParking ? 1 : 0) + intelKeys.filter((key) => intelLayers[key]).length;

	function formatDistance(place: Place): string {
		const meters = haversineMeters(placeOrigin, [place.lon, place.lat]);
		if (meters < 1000) return `${Math.round(meters / 10) * 10} m away`;
		return `${(meters / 1000).toFixed(1)} km away`;
	}

	let didRevealFlights = false;
	let mapReady = false;
	let mapFailed = false;

	function tryRevealFlights() {
		if (didRevealFlights || !flights.length || !intelLayers.flights) return;
		didRevealFlights = Boolean(city?.revealFlightsIfNeeded?.(flights));
	}

	onMount(() => {
		categoryIcons = Object.fromEntries(
			PLACE_CATEGORIES.map((key) => [key, placeIconDataUrl(key, 96)])
		) as Record<PlaceCategory, string>;

		void refreshIntel().then(() => tryRevealFlights());
		pollTimer = setInterval(() => {
			void refreshIntel();
		}, 20000);
		return () => {
			if (pollTimer) clearInterval(pollTimer);
		};
	});

	onDestroy(() => {
		if (pollTimer) clearInterval(pollTimer);
	});

	async function refreshIntel() {
		try {
			const response = await fetch('/api/intel');
			if (!response.ok) return;
			const payload = await response.json();
			// Keep last-good aircraft if a poll returns empty (transient ADS-B blip).
			if (Array.isArray(payload.flights) && payload.flights.length > 0) {
				flights = payload.flights;
				queueMicrotask(tryRevealFlights);
			}
			if (payload.quakes) quakes = payload.quakes;
			if (payload.cameras) cameras = payload.cameras;
			if (payload.notes) intelNotes = payload.notes;
		} catch {
			/* Keep last good snapshot. */
		}
	}

	function findAircraft() {
		if (!intelLayers.flights) {
			intelLayers = { ...intelLayers, flights: true };
		}
		layersOpen = false;
		didRevealFlights = true;
		city?.fitFlights?.(flights);
	}

	function onCityReady() {
		mapReady = true;
		// Guarantee every place category is on so the map is never an empty orbit.
		layers = setAllPlaceLayers(true);
		showParking = true;
		intelLayers = { ...createDefaultIntelLayers(), ...intelLayers, traffic: true };
		tryRevealFlights();
	}

	function home(event: MouseEvent) {
		if ((event.button ?? 0) !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
			return;
		event.preventDefault();
		selected = null;
		selectedKind = null;
		layersOpen = false;
		mode = 'orbit';
		queueMicrotask(() => city?.flyHome());
	}

	function togglePlaceLayer(key: PlaceCategory) {
		layers = { ...layers, [key]: !layers[key] };
	}

	function toggleIntelLayer(key: IntelLayer) {
		intelLayers = { ...intelLayers, [key]: !intelLayers[key] };
		if (key === 'cameras' && !intelLayers.cameras && selectedKind === 'camera') {
			selected = null;
			selectedKind = null;
		}
		if (key === 'flights' && !intelLayers.flights && selectedKind === 'flight') {
			selected = null;
			selectedKind = null;
		}
		// Enabling Aircraft only toggles markers — use “Find aircraft” to reframe.
	}

	/** Parking is always-on (product contract) — Layers HUD cannot hide map markers. */
	function toggleParkingLayer() {
		showParking = true;
	}

	function showAllPlaces() {
		layers = setAllPlaceLayers(true);
	}

	function hideAllPlaces() {
		layers = setAllPlaceLayers(false);
	}

	function scrollToAbout() {
		if (shellEl && footerEl) {
			shellEl.scrollTo({ top: footerEl.offsetTop, behavior: 'smooth' });
			return;
		}
		footerEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	function scrollToMap() {
		shellEl?.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function onSelect(
		event: CustomEvent<{ id: string; kind: 'place' | 'parking' | 'flight' | 'camera' | 'quake' }>
	) {
		const { id, kind } = event.detail;
		if (kind === 'parking') return;
		if (kind === 'flight') {
			const flight = flights.find((item) => item.id === id) || null;
			selected = flight;
			selectedKind = flight ? 'flight' : null;
			if (flight) city?.trackFlight?.(flight);
			return;
		}
		if (kind === 'camera') {
			const camera = cameras.find((item) => item.id === id) || null;
			selected = camera;
			selectedKind = camera ? 'camera' : null;
			return;
		}
		if (kind === 'quake') return;
		const place = places.find((item) => item.id === id) || null;
		selected = place;
		selectedKind = place ? 'place' : null;
	}

	function locate() {
		locationError = '';
		if (!window.isSecureContext) {
			locationError =
				'Location requires HTTPS. Open this app using an HTTPS address; browsers block location on HTTP network addresses without asking for permission.';
			return;
		}
		if (!navigator.geolocation) {
			locationError = 'Your browser does not support location.';
			return;
		}
		locating = true;
		const currentRequest = ++request;
		navigator.geolocation.getCurrentPosition(
			(result) => {
				if (currentRequest !== request) return;
				position = [result.coords.latitude, result.coords.longitude];
				locating = false;
				city?.flyTo(result.coords.longitude, result.coords.latitude, 16.2);
			},
			(error) => {
				if (currentRequest !== request) return;
				locating = false;
				locationError =
					error.code === 1
						? 'Location access was denied. Allow location for this website in your browser settings and try again.'
						: error.code === 3
							? 'Finding your location timed out. Please try again.'
							: 'Your location is unavailable. Please try again.';
			},
			{ enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
		);
	}

	function placeOf(value: Place | Flight | Camera | null): Place | null {
		return selectedKind === 'place' ? (value as Place) : null;
	}
	function flightOf(value: Place | Flight | Camera | null): Flight | null {
		return selectedKind === 'flight' ? (value as Flight) : null;
	}
	function cameraOf(value: Place | Flight | Camera | null): Camera | null {
		return selectedKind === 'camera' ? (value as Camera) : null;
	}

	onMount(() => {
		const onKey = (event: KeyboardEvent) => {
			const match = SENSOR_LOOKS.find((look) => look.key === event.key);
			if (match) sensorLook = match.id;
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	/**
	 * Immersive map fills the viewport. Page scroll is intentional:
	 * two-finger vertical drag (stable span) or trackpad scroll → credits;
	 * pinch still zooms the map.
	 */
	onMount(() => {
		const stage = mapStageEl;
		if (!stage) return;
		return attachMapShellGestures(stage, () => shellEl);
	});
</script>

<div class="shell" data-sensor={sensorLook} bind:this={shellEl}>
	<div class="map-stage" bind:this={mapStageEl}>
		<ZurichBootSplash ready={mapReady} failed={mapFailed} />
		<div class="sensor-veil" aria-hidden="true"></div>
		<ZurichCity
			bind:this={city}
			places={visibleMapPlaces}
			parkings={parkings}
			{layers}
			showParking={true}
			{intelLayers}
			{flights}
			{cameras}
			{quakes}
			{mode}
			selectedId={selectedKind === 'place'
				? placeOf(selected)?.id || null
				: selectedKind === 'flight'
					? flightOf(selected)?.id || null
					: selectedKind === 'camera'
						? cameraOf(selected)?.id || null
						: null}
			userPosition={position}
			on:select={onSelect}
			on:ready={onCityReady}
			on:error={() => {
				mapFailed = true;
			}}
		/>

		<header class="topbar">
			<a class="brand" href={resolve('/')} aria-label="Züri City home" on:click={home}>
				<img src="/favicon.svg" alt="" width="32" height="32" />
				<div>
					<p class="brand-kicker">Zürich · live</p>
					<h1>Züri City</h1>
				</div>
			</a>
			<button
				type="button"
				class="about-btn"
				on:click={scrollToAbout}
				aria-label="About and credits"
				title="About — or two-finger swipe down on the map"
			>
				About
				<span aria-hidden="true">↓</span>
			</button>
		</header>

		<!-- Desktop left briefing -->
		<aside class="desk-hud" aria-label="City briefing">
			<p class="eyebrow">On the map</p>
			<h2>See Zürich move</h2>
			<p>Modeled street colors and always-on parking. Open Layers for places and live feeds.</p>
			<div class="mode-row">
				<button
					type="button"
					class:active={mode === 'orbit'}
					aria-pressed={mode === 'orbit'}
					on:click={() => (mode = 'orbit')}>Orbit</button
				>
				<button
					type="button"
					class:active={mode === 'walk'}
					aria-pressed={mode === 'walk'}
					on:click={() => (mode = 'walk')}>Walk</button
				>
				<button type="button" on:click={locate} disabled={locating}
					>{locating ? 'Locating…' : 'Locate'}</button
				>
			</div>
			{#if mode === 'walk'}
				<p class="hint">Hold to walk · drag to look · WASD on desktop</p>
			{/if}
			{#if locationError}
				<p class="notice error" role="alert">{locationError}</p>
			{/if}
			{#if placesError || intelNotes[0]}
				<p class="notice" role="status">{placesError || intelNotes[0]}</p>
			{/if}
			{#if parkingError}
				<p class="notice" role="status">{parkingError}</p>
			{/if}
			<div class="sensor-row" aria-label="Sensor looks">
				{#each SENSOR_LOOKS as look (look.id)}
					<button
						type="button"
						class:active={sensorLook === look.id}
						aria-pressed={sensorLook === look.id}
						on:click={() => (sensorLook = look.id)}>{look.label}</button
					>
				{/each}
			</div>
		</aside>

		{#if locationError}
			<p class="mobile-alert" role="alert">{locationError}</p>
		{/if}

		<div class="dock" aria-label="Map controls">
			{#if layersOpen}
				<div id="layer-sheet" class="layer-sheet" role="dialog" aria-label="Map layers">
					<LayersPanel
						placeLayers={layers}
						{intelLayers}
						{showParking}
						{openNowOnly}
						{counts}
						{categoryIcons}
						dismissible
						onDismiss={() => (layersOpen = false)}
						onTogglePlace={togglePlaceLayer}
						onToggleIntel={toggleIntelLayer}
						onToggleParking={toggleParkingLayer}
						onToggleOpenNow={() => (openNowOnly = !openNowOnly)}
						onShowAllPlaces={showAllPlaces}
						onHideAllPlaces={hideAllPlaces}
						onFindAircraft={findAircraft}
						flightCount={counts.flights}
					>
						<div class="look-block">
							<p class="look-title">Look</p>
							<div class="look-grid" role="group" aria-label="Sensor looks">
								{#each SENSOR_LOOKS as look (look.id)}
									<button
										type="button"
										class="look"
										class:on={sensorLook === look.id}
										aria-pressed={sensorLook === look.id}
										on:click={() => (sensorLook = look.id)}>{look.label}</button
									>
								{/each}
							</div>
						</div>
					</LayersPanel>
				</div>
			{/if}
			<nav class="dock-bar" aria-label="Map modes">
				<button
					type="button"
					class:active={mode === 'orbit'}
					aria-pressed={mode === 'orbit'}
					on:click={() => (mode = 'orbit')}>Orbit</button
				>
				<button
					type="button"
					class:active={mode === 'walk'}
					aria-pressed={mode === 'walk'}
					on:click={() => (mode = 'walk')}>Walk</button
				>
				<button type="button" on:click={locate} disabled={locating} aria-label="Locate me"
					>{locating ? '…' : 'Locate'}</button
				>
				<button
					type="button"
					class:active={layersOpen}
					aria-pressed={layersOpen}
					aria-expanded={layersOpen}
					aria-controls="layer-sheet"
					on:click={() => {
						layersOpen = !layersOpen;
					}}>Layers</button
				>
			</nav>
			{#if mode === 'walk'}
				<p class="walk-hint" role="status">Walk · drag to look · hold to move</p>
			{/if}

		</div>

		<aside class="desk-layers" aria-label="Desktop map layers">
			<LayersPanel
				placeLayers={layers}
				{intelLayers}
				{showParking}
				{openNowOnly}
				{counts}
				{categoryIcons}
				onTogglePlace={togglePlaceLayer}
				onToggleIntel={toggleIntelLayer}
				onToggleParking={toggleParkingLayer}
				onToggleOpenNow={() => (openNowOnly = !openNowOnly)}
				onShowAllPlaces={showAllPlaces}
				onHideAllPlaces={hideAllPlaces}
				onFindAircraft={findAircraft}
				flightCount={counts.flights}
			/>
		</aside>

		{#if selected && selectedKind === 'place'}
			{@const place = placeOf(selected)}
			{#if place}
				<article class="inspect" aria-label={place.name}>
					<button type="button" class="close" aria-label="Close place" on:click={() => (selected = null)}
						>×</button
					>
					<p class="eyebrow">{CATEGORY_LABEL[place.category]}</p>
					<h3>{place.name}</h3>
					<p>{place.subtitle}</p>
					<p class="open-hint" class:open={place.isOpen === true} class:closed={place.isOpen === false}>{place.openHint}</p>
					<p class="distance">{formatDistance(place)}</p>
					<!-- eslint-disable svelte/no-navigation-without-resolve -->
					<a
						href={`https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}#map=18/${place.lat}/${place.lon}`}
						>Open in OSM ↗</a
					>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				</article>
			{/if}
		{/if}

		<ContactViewer
			camera={cameraOf(selected)}
			flight={flightOf(selected)}
			onClose={() => {
				selected = null;
				selectedKind = null;
			}}
		/>
	</div>

	<footer class="credits" id="about" bind:this={footerEl}>
		<button type="button" class="back-map" on:click={scrollToMap}>↑ Back to map</button>
		<span>SWISSIMAGE · OSM · OpenFreeMap · ADS-B · USGS · PLS Zürich</span>
		<span class="dot">·</span>
		<InstallApp />
		<span class="dot">·</span>
		<a href="https://github.com/danacr/Zuri-City">GitHub</a>
		<p class="gesture-hint">Tip: two-finger swipe on the map, or trackpad scroll, reaches credits. Pinch still zooms.</p>
	</footer>
</div>

<style>
	.shell {
		/* Fixed immersive viewport — map fills the screen; shell alone scrolls to credits. */
		position: fixed;
		inset: 0;
		height: 100dvh;
		height: 100svh;
		overflow-x: hidden;
		overflow-y: auto;
		overscroll-behavior-y: contain;
		-webkit-overflow-scrolling: touch;
		scroll-snap-type: y proximity;
		background: #07131f;
		color: var(--text);
		font-family: 'Quicksand', 'Avenir Next', 'Segoe UI', sans-serif;
	}
	.map-stage {
		position: relative;
		height: 100dvh;
		height: 100svh;
		overflow: hidden;
		isolation: isolate;
		scroll-snap-align: start;
		scroll-snap-stop: always;
	}
	.sensor-veil {
		pointer-events: none;
		position: absolute;
		inset: 0;
		z-index: 2;
		mix-blend-mode: color;
		opacity: 0;
		transition: opacity 0.35s ease;
	}
	.shell[data-sensor='nvg'] .sensor-veil {
		opacity: 1;
		background: #1cff6a55;
		mix-blend-mode: color;
		box-shadow: inset 0 0 80px #003311aa;
	}
	.shell[data-sensor='flir'] .sensor-veil {
		opacity: 1;
		background: linear-gradient(180deg, #ff003388, #ffaa0044 40%, #0011ff55);
		mix-blend-mode: hard-light;
	}
	.shell[data-sensor='crt'] .sensor-veil {
		opacity: 1;
		background: repeating-linear-gradient(
			0deg,
			#00ff8822 0 1px,
			transparent 1px 3px
		);
		mix-blend-mode: screen;
	}
	.shell[data-sensor='noir'] .sensor-veil {
		opacity: 1;
		background: #00000055;
		mix-blend-mode: saturation;
	}
	.shell[data-sensor='snow'] .sensor-veil {
		opacity: 1;
		background: #dfefff66;
		mix-blend-mode: soft-light;
	}

	.topbar {
		position: absolute;
		z-index: 30;
		top: 0;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: calc(8px + env(safe-area-inset-top)) 12px 8px;
		background: linear-gradient(180deg, #07131fdd, transparent);
		pointer-events: none;
	}
	.topbar > * {
		pointer-events: auto;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 8px;
		text-decoration: none;
		color: #f4f7fb;
		min-width: 0;
	}
	.brand-kicker {
		font-size: 9px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		opacity: 0.75;
		font-weight: 700;
	}
	h1 {
		font-size: clamp(20px, 5vw, 28px);
		font-weight: 800;
		letter-spacing: -0.04em;
		line-height: 1;
	}
	.about-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		min-height: 36px;
		padding: 0 12px;
		border-radius: 999px;
		border: 1px solid #ffffff28;
		background: color-mix(in srgb, #0b1a2a 82%, transparent);
		color: #e8f0fa;
		font-size: 12px;
		font-weight: 750;
		backdrop-filter: blur(10px);
	}

	/* Desktop briefing — hidden on mobile */
	.desk-hud,
	.desk-layers {
		display: none;
	}

	.mobile-alert {
		position: absolute;
		z-index: 29;
		left: 10px;
		right: 10px;
		bottom: calc(118px + env(safe-area-inset-bottom));
		padding: 10px 12px;
		border-radius: 12px;
		background: var(--red-soft, #ffedf0);
		color: var(--red, #b42332);
		border: 1px solid var(--red-border, #f4ced3);
		font-size: 12px;
		line-height: 1.4;
		box-shadow: 0 10px 28px #07152644;
	}

	/* Mobile dock — one bar + optional layers sheet (no horizontal chrome) */
	.dock {
		position: absolute;
		z-index: 28;
		left: 10px;
		right: 10px;
		bottom: calc(12px + env(safe-area-inset-bottom));
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		gap: 8px;
		max-height: min(72vh, 560px);
		pointer-events: none;
	}
	.dock > * {
		pointer-events: auto;
	}
	.dock-bar {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 6px;
		padding: 8px;
		border-radius: 14px;
		background: color-mix(in srgb, #0b1a2a 90%, transparent);
		border: 1px solid #ffffff22;
		backdrop-filter: blur(14px);
		box-shadow: 0 12px 32px #03101855;
		flex: 0 0 auto;
	}
	.dock-bar button {
		min-height: 42px;
		border-radius: 11px;
		background: #ffffff12;
		color: #f4f7fb;
		font-weight: 750;
		font-size: 12px;
		border: none;
	}
	.dock-bar button.active {
		background: var(--accent-button);
	}
	.layer-sheet {
		flex: 1 1 auto;
		min-height: 0;
		max-height: min(58vh, 480px);
		overflow: auto;
		padding: 12px;
		border-radius: 16px;
		background: color-mix(in srgb, var(--surface) 96%, transparent);
		border: 1px solid var(--border);
		backdrop-filter: blur(18px);
		box-shadow: 0 18px 44px #07152666;
		-webkit-overflow-scrolling: touch;
	}
	.look-block {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 4px;
	}
	.look-title {
		margin: 0;
		font-size: 11px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-weight: 750;
		color: var(--muted);
	}
	.look-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 6px;
	}
	.look {
		min-height: 36px;
		border-radius: 10px;
		border: 1px solid var(--border);
		background: var(--surface-muted);
		color: var(--muted);
		font-size: 11px;
		font-weight: 750;
	}
	.look.on {
		color: var(--text);
		background: var(--accent-soft);
		border-color: color-mix(in srgb, var(--accent) 35%, transparent);
	}

	.inspect {
		position: absolute;
		z-index: 26;
		left: 10px;
		right: 10px;
		bottom: calc(108px + env(safe-area-inset-bottom));
		padding: 14px 16px;
		border-radius: 16px;
		background: color-mix(in srgb, var(--surface) 94%, transparent);
		border: 1px solid var(--border);
		backdrop-filter: blur(14px);
		box-shadow: 0 14px 32px #07152650;
	}
	.inspect h3 {
		font-size: 18px;
		font-weight: 800;
		letter-spacing: -0.03em;
		margin: 2px 0 6px;
	}
	.inspect p {
		color: var(--muted);
		font-size: 13px;
		line-height: 1.45;
	}
	.open-hint {
		margin: 8px 0 10px !important;
		color: var(--text) !important;
		font-weight: 650;
	}
	.open-hint.open {
		color: #12b886 !important;
	}
	.open-hint.closed {
		color: #fa5252 !important;
	}
	.distance {
		margin: -4px 0 10px !important;
		font-size: 12px !important;
		color: var(--muted) !important;
	}
	.inspect a {
		color: var(--accent);
		font-weight: 700;
		font-size: 13px;
		text-decoration: none;
	}
	.close {
		position: absolute;
		top: 6px;
		right: 6px;
		width: 40px;
		height: 40px;
		font-size: 22px;
		color: var(--muted);
		border: none;
		background: transparent;
	}
	.eyebrow {
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-weight: 750;
		color: var(--muted);
	}
	.credits {
		position: relative;
		z-index: 24;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 18px 14px calc(18px + env(safe-area-inset-bottom));
		font-size: 11px;
		color: #c9d8e8;
		background: linear-gradient(180deg, #0a1828, #07131f);
		border-top: 1px solid #1c2f44;
		scroll-snap-align: end;
	}
	.credits a {
		color: #9dceff;
	}
	.back-map {
		flex: 1 0 100%;
		margin: 0 0 4px;
		padding: 8px 12px;
		border: 1px solid #2a415c;
		border-radius: 999px;
		background: #132536;
		color: #e8f2ff;
		font: inherit;
		font-size: 12px;
		font-weight: 700;
	}
	.gesture-hint {
		flex: 1 0 100%;
		margin: 6px 0 0;
		text-align: center;
		font-size: 11px;
		line-height: 1.4;
		color: #8ea6bd;
	}
	.dot {
		opacity: 0.45;
	}
	.notice {
		margin-top: 8px;
		padding: 8px 10px;
		border-radius: 10px;
		background: var(--accent-soft);
		color: var(--accent);
		font-size: 12px;
		line-height: 1.4;
	}
	.error {
		background: var(--red-soft, #ffedf0);
		color: var(--red, #b42332);
	}
	.hint {
		margin-top: 8px;
		font-size: 11px;
		color: var(--muted);
	}

	@media (min-width: 860px) {
		.dock,
		.mobile-alert {
			display: none;
		}
		.desk-hud,
		.desk-layers {
			display: grid;
			position: absolute;
			z-index: 22;
			width: min(300px, calc(100vw - 28px));
			padding: 12px;
			border-radius: 16px;
			background: color-mix(in srgb, var(--surface) 90%, transparent);
			border: 1px solid var(--border);
			backdrop-filter: blur(16px);
			box-shadow: 0 16px 40px #07152640;
			gap: 8px;
		}
		.desk-hud {
			left: 16px;
			top: calc(78px + env(safe-area-inset-top));
		}
		.desk-hud h2 {
			font-size: 24px;
			font-weight: 800;
			letter-spacing: -0.04em;
			margin: 2px 0 6px;
		}
		.desk-hud > p {
			color: var(--muted);
			font-size: 13px;
			line-height: 1.5;
		}
		.desk-layers {
			right: 16px;
			left: auto;
			top: calc(78px + env(safe-area-inset-top));
			width: min(320px, calc(100vw - 32px));
			max-height: calc(100dvh - 110px);
			overflow: auto;
			align-content: start;
		}
		.mode-row {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 6px;
			margin-top: 10px;
			padding: 0;
			background: transparent;
		}
		.sensor-row {
			display: flex;
			flex-wrap: wrap;
			gap: 8px;
			margin-top: 10px;
		}
		.mode-row button,
		.sensor-row button {
			min-height: 40px;
			padding: 0 12px;
			border-radius: 12px;
			background: var(--surface-muted);
			color: var(--text);
			font-weight: 700;
			font-size: 12px;
			border: 1px solid var(--border);
		}
		.mode-row button.active,
		.sensor-row button.active {
			background: var(--accent-button, #1260ce);
			color: #fff;
		}
		.inspect {
			left: auto;
			right: 16px;
			width: min(320px, calc(100vw - 32px));
			bottom: calc(24px + env(safe-area-inset-bottom));
		}
	}
	.walk-hint {
		position: absolute;
		left: 50%;
		bottom: calc(5.5rem + env(safe-area-inset-bottom, 0px));
		transform: translateX(-50%);
		z-index: 6;
		margin: 0;
		padding: 0.35rem 0.75rem;
		border-radius: 999px;
		background: rgba(8, 14, 24, 0.72);
		color: #f2efe8;
		font-size: 0.72rem;
		letter-spacing: 0.02em;
		pointer-events: none;
		white-space: nowrap;
	}
</style>
