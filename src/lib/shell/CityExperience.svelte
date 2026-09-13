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
	import { availability, spotCount, type Parking } from '$lib/parking';
	import {
		type Camera,
		type Flight,
		type IntelLayer,
		type Quake,
		type TrafficSegment
	} from '$lib/intel/types';
	import type { PageData } from '../../routes/$types';

	export let data: PageData;

	let mode: 'orbit' | 'walk' = 'orbit';
	/** Mobile starts map-first; open the sheet from the Layers control when needed. */
	let layersOpen = false;
	let selected: Place | Flight | Camera | Parking | null = null;
	let selectedKind: 'place' | 'flight' | 'camera' | 'parking' | null = null;
	let city: ZurichCity;
	let position: [number, number] | null = null;
	let locating = false;
	let locationError = '';
	let request = 0;
	let layers: Record<PlaceCategory, boolean> = createDefaultPlaceLayers();
	let openNowOnly = false;
	let showParking = PARKING_LAYER.defaultVisible;
	let intelLayers: Record<IntelLayer, boolean> = createDefaultIntelLayers();
	/** Local copies so the shell can paint before streamed `hydrateCity` resolves. */
	let places: Place[] = data.places;
	let parkings: Parking[] = data.parkings;
	let placesError = data.placesError;
	let parkingError = data.error;
	let refreshedAt: string | null = data.refreshedAt;
	let flights: Flight[] = data.intel?.flights ?? [];
	let cameras: Camera[] = data.intel?.cameras ?? [];
	let quakes: Quake[] = data.intel?.quakes ?? [];
	let traffic: TrafficSegment[] = data.intel?.traffic ?? [];
	let intelNotes: string[] = data.intel?.notes ?? [];
	let hydrateGen = 0;
	let lastHydrate: PageData['hydrateCity'] | undefined;
	let lastHydratePlaces: PageData['hydratePlaces'] | undefined;
	let pollTimer: ReturnType<typeof setInterval> | undefined;
	let categoryIcons: Partial<Record<PlaceCategory, string>> = {};
	const intelKeys: IntelLayer[] = INTEL_LAYER_IDS;
	let shellEl: HTMLElement | undefined;
	let footerEl: HTMLElement | undefined;
	let mapStageEl: HTMLElement | undefined;

	$: {
		places = data.places.length ? data.places : places;
		// Never clobber a landed PLS set with the empty sync seed.
		if (data.parkings.length) parkings = data.parkings;
		placesError = data.placesError;
		parkingError = data.error;
		refreshedAt = data.refreshedAt;
		flights = data.intel?.flights?.length ? data.intel.flights : flights;
		cameras = data.intel?.cameras?.length ? data.intel.cameras : cameras;
		quakes = data.intel?.quakes?.length ? data.intel.quakes : quakes;
		intelNotes = data.intel?.notes ?? intelNotes;
		if (!browser) break $;
		// Late Overpass must merge even after hydrateCity already resolved with fallback places.
		if (data.hydratePlaces && data.hydratePlaces !== lastHydratePlaces) {
			lastHydratePlaces = data.hydratePlaces;
			void Promise.resolve(data.hydratePlaces).then((city) => {
				if (!city?.places?.length) return;
				mergePlaces(city.places);
				placesError = city.error || '';
			});
		}
		if (data.hydrateCity === lastHydrate) break $;
		lastHydrate = data.hydrateCity;
		const gen = ++hydrateGen;
		void Promise.resolve(data.hydrateCity).then((live) => {
			if (gen !== hydrateGen || !live) return;
			// Merge-by-id so a sparse/failed Overpass response never blanks the map.
			if (live.places?.length) {
				const byId = new Map(places.map((place) => [place.id, place]));
				for (const place of live.places) byId.set(place.id, place);
				places = [...byId.values()];
			}
			// Apply non-empty PLS; keep last-good markers if the next stream is empty.
			if (Array.isArray(live.parkings) && live.parkings.length) {
				parkings = live.parkings;
			}
			placesError = live.placesError;
			parkingError = live.error;
			refreshedAt = live.refreshedAt;
			// Keep last-good intel when soft-timeout EMPTY_INTEL arrives after a live poll.
			if (live.intel?.flights?.length) flights = live.intel.flights;
			if (live.intel?.cameras?.length) cameras = live.intel.cameras;
			if (live.intel?.quakes?.length) quakes = live.intel.quakes;
			if (live.intel?.notes?.length) intelNotes = live.intel.notes;
			if (Array.isArray(live.intel?.traffic) && live.intel.traffic.length) {
				traffic = live.intel.traffic;
			}
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
		traffic: traffic.length,
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
	/** One-shot: enable Roadworks when the first live sites arrive. */
	let trafficAutoEnabled = false;

	/** Turn Roadworks on once when segments first land — stay off while empty. */
	$: if (mapReady && traffic.length > 0 && !trafficAutoEnabled) {
		trafficAutoEnabled = true;
		if (!intelLayers.traffic) intelLayers = { ...intelLayers, traffic: true };
	}

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
			if (Array.isArray(payload.traffic)) traffic = payload.traffic;
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
		// Keep Roadworks off until live sites exist — don't advertise an empty layer.
		intelLayers = {
			...createDefaultIntelLayers(),
			...intelLayers,
			traffic: traffic.length > 0
		};
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

	
	let placesFetchTimer: ReturnType<typeof setTimeout> | undefined;
	let placesFetchGen = 0;
	let lastPlacesBboxKey = '';

	function mergePlaces(incoming: Place[]) {
		if (!incoming.length) return;
		const byId = new Map(places.map((place) => [place.id, place]));
		for (const place of incoming) byId.set(place.id, place);
		places = [...byId.values()];
	}

	function onViewportPlaces(
		event: CustomEvent<{ west: number; south: number; east: number; north: number; zoom: number }>
	) {
		const { west, south, east, north, zoom } = event.detail;
		if (zoom < 13) return;
		const key = [west, south, east, north].map((n) => n.toFixed(3)).join(':');
		if (key === lastPlacesBboxKey) return;
		if (placesFetchTimer) clearTimeout(placesFetchTimer);
		placesFetchTimer = setTimeout(() => {
			lastPlacesBboxKey = key;
			const gen = ++placesFetchGen;
			const params = new URLSearchParams({
				west: String(west),
				south: String(south),
				east: String(east),
				north: String(north),
				zoom: String(zoom)
			});
			void fetch(`/api/places?${params}`)
				.then((response) => (response.ok ? response.json() : null))
				.then((payload) => {
					if (gen !== placesFetchGen || !payload?.places?.length) return;
					mergePlaces(payload.places as Place[]);
				})
				.catch(() => {
					/* Keep last-good places. */
				});
		}, 450);
	}

	function toggleParkingLayer() {
		showParking = !showParking;
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
		if (kind === 'parking') {
			const parking =
				parkings.find((item) => (item.id || item.name) === id) || null;
			selected = parking;
			selectedKind = parking ? 'parking' : null;
			return;
		}
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

	function placeOf(value: Place | Flight | Camera | Parking | null): Place | null {
		return selectedKind === 'place' ? (value as Place) : null;
	}
	function parkingOf(value: Place | Flight | Camera | Parking | null): Parking | null {
		return selectedKind === 'parking' ? (value as Parking) : null;
	}
	function flightOf(value: Place | Flight | Camera | Parking | null): Flight | null {
		return selectedKind === 'flight' ? (value as Flight) : null;
	}
	function cameraOf(value: Place | Flight | Camera | Parking | null): Camera | null {
		return selectedKind === 'camera' ? (value as Camera) : null;
	}

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

<div class="shell" bind:this={shellEl}>
	<div class="map-stage" bind:this={mapStageEl}>
		<ZurichBootSplash ready={mapReady} failed={mapFailed} />
		<ZurichCity
			bind:this={city}
			places={visibleMapPlaces}
			parkings={parkings}
			{layers}
			{showParking}
			{intelLayers}
			{flights}
			{cameras}
			{quakes}
			{traffic}
			{mode}
			selectedId={selectedKind === 'place'
				? placeOf(selected)?.id || null
				: selectedKind === 'parking'
					? parkingOf(selected)?.id || parkingOf(selected)?.name || null
					: selectedKind === 'flight'
						? flightOf(selected)?.id || null
						: selectedKind === 'camera'
							? cameraOf(selected)?.id || null
							: null}
			userPosition={position}
			on:select={onSelect}
			on:ready={onCityReady}
			on:viewport={onViewportPlaces}
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

		{#if locationError}
			<p class="mobile-alert" role="alert">{locationError}</p>
		{/if}
		{#if placesError}
			<p class="desk-status" role="status">{placesError}</p>
		{/if}
		{#if parkingError}
			<p class="desk-status" role="status">{parkingError}</p>
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
					</LayersPanel>
				</div>
			{/if}
			{#if mode === 'walk'}
				<p class="walk-hint" role="status">Walk · drag to look · hold to move</p>
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

		</div>

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
					{#if place.phone}
						<a href={`tel:${place.phone.replace(/\s+/g, '')}`}>{place.phone}</a>
					{/if}
					{#if place.website}
						<a href={place.website} rel="noopener noreferrer" target="_blank">Website ↗</a>
					{/if}
					<a
						href={`https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}#map=18/${place.lat}/${place.lon}`}
						>Open in OSM ↗</a
					>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				</article>
			{/if}
		{/if}

		{#if selected && selectedKind === 'parking'}
			{@const parking = parkingOf(selected)}
			{#if parking}
				<article class="inspect" aria-label={parking.name}>
					<button
						type="button"
						class="close"
						aria-label="Close parking"
						on:click={() => {
							selected = null;
							selectedKind = null;
						}}>×</button
					>
					<p class="eyebrow">Parking</p>
					<h3>{parking.name}</h3>
					{#if parking.address}
						<p>{parking.address}</p>
					{/if}
					<p class="open-hint" class:open={availability(parking) === 'Open'} class:closed={availability(parking) === 'Closed' || availability(parking) === 'Full'}>
						{availability(parking)} · {spotCount(parking)}
					</p>
					<!-- eslint-disable svelte/no-navigation-without-resolve -->
					{#if parking.directions}
						<a href={parking.directions}>Directions ↗</a>
					{/if}
					{#if parking.link}
						<a href={parking.link}>PLS details ↗</a>
					{/if}
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
		<span>SWISSIMAGE · OSM · OpenFreeMap · ADS-B · USGS · PLS Zürich · KTZH Baustellen</span>
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


	.desk-status {
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
	.walk-hint {
		align-self: center;
		margin: 0;
		padding: 8px 14px;
		border-radius: 999px;
		background: color-mix(in srgb, #0b1a2a 92%, transparent);
		border: 1px solid #ffffff28;
		backdrop-filter: blur(12px);
		box-shadow: 0 10px 24px #03101855;
		color: #e8f2ff;
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.01em;
		line-height: 1.3;
		text-align: center;
		pointer-events: none;
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

	@media (min-width: 860px) {
		.mobile-alert {
			display: none;
		}
		/* Map-first desktop: same Orbit/Walk/Locate/Layers dock as phone — no always-on side columns. */
		.dock {
			left: 50%;
			right: auto;
			bottom: calc(20px + env(safe-area-inset-bottom));
			width: min(420px, calc(100vw - 48px));
			transform: translateX(-50%);
		}
		.layer-sheet {
			max-height: min(64vh, 560px);
		}
		.desk-status {
			display: block;
			position: absolute;
			z-index: 24;
			left: 16px;
			top: calc(78px + env(safe-area-inset-top));
			max-width: min(360px, calc(100vw - 32px));
			padding: 10px 12px;
			border-radius: 12px;
			background: color-mix(in srgb, var(--surface) 92%, transparent);
			border: 1px solid var(--border);
			backdrop-filter: blur(12px);
			font-size: 12px;
			line-height: 1.4;
			color: var(--muted);
			box-shadow: 0 10px 28px #07152640;
		}
		.inspect {
			left: 16px;
			right: auto;
			width: min(360px, calc(100vw - 32px));
			bottom: calc(96px + env(safe-area-inset-bottom));
		}
	}
</style>
