<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { title, description, structuredData } from '$lib/seo';
	$: jsonLd = `<script type="application/ld+json">${structuredData(data.siteUrl)}<${'/'}script>`;
	import InstallApp from '$lib/InstallApp.svelte';
	import ZurichCity from '$lib/city/ZurichCity.svelte';
	import ZurichBootSplash from '$lib/city/ZurichBootSplash.svelte';
	import ParkingPanel from '$lib/ParkingPanel.svelte';
	import ContactViewer from '$lib/intel/ContactViewer.svelte';
	import { CATEGORY_LABEL, CATEGORY_COLOR, PLACE_CATEGORIES, ZURICH_CENTER, haversineMeters, type Place, type PlaceCategory } from '$lib/city/places';
	import { placeIconDataUrl } from '$lib/city/placeIcons';
	import type { Parking } from '$lib/parking';
	import {
		INTEL_LAYER_COLOR,
		INTEL_LAYER_LABEL,
		SENSOR_LOOKS,
		TRAFFIC_LEGEND,
		type Camera,
		type Flight,
		type IntelLayer,
		type SensorLook,
		type Quake
	} from '$lib/intel/types';
	import type { PageData } from './$types';

	export let data: PageData;

	let mode: 'orbit' | 'walk' = 'orbit';
	let parkingOpen = false;
	let layersOpen = false;
	let selected: Place | Parking | Flight | Camera | null = null;
	let selectedKind: 'place' | 'parking' | 'flight' | 'camera' | null = null;
	let city: ZurichCity;
	let position: [number, number] | null = null;
	let locating = false;
	let locationError = '';
	let request = 0;
	let layers: Record<PlaceCategory, boolean> = Object.fromEntries(
		PLACE_CATEGORIES.map((key) => [key, true])
	) as Record<PlaceCategory, boolean>;
	let openNowOnly = false;
	let intelLayers: Record<IntelLayer, boolean> = {
		flights: true,
		cameras: true,
		traffic: true,
		quakes: false,
		detection: true
	};
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
	const placeKeys: PlaceCategory[] = PLACE_CATEGORIES;
	let categoryIcons: Partial<Record<PlaceCategory, string>> = {};
	const intelKeys: IntelLayer[] = ['flights', 'cameras', 'traffic', 'quakes', 'detection'];

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
			places = live.places;
			parkings = live.parkings;
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
	};

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
		tryRevealFlights();
	}

	function home(event: MouseEvent) {
		if ((event.button ?? 0) !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
			return;
		event.preventDefault();
		selected = null;
		selectedKind = null;
		setParkingOpen(false);
		layersOpen = false;
		mode = 'orbit';
		queueMicrotask(() => city?.flyHome());
	}

	function setParkingOpen(value: boolean) {
		parkingOpen = value;
		if (value) layersOpen = false;
		if (!value && selectedKind === 'parking') {
			selected = null;
			selectedKind = null;
		}
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

	function onSelect(
		event: CustomEvent<{ id: string; kind: 'place' | 'parking' | 'flight' | 'camera' | 'quake' }>
	) {
		const { id, kind } = event.detail;
		if (kind === 'parking') {
			const parking = parkings.find((item) => (item.id || item.name) === id) || null;
			selected = parking;
			selectedKind = parking ? 'parking' : null;
			if (parking) setParkingOpen(true);
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

	function focusParking(parking: Parking) {
		selected = parking;
		selectedKind = 'parking';
		if (parking.coordinates) city?.flyTo(parking.coordinates[1], parking.coordinates[0]);
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

	function placeOf(value: Place | Parking | Flight | Camera | null): Place | null {
		return selectedKind === 'place' ? (value as Place) : null;
	}
	function parkingOf(value: Place | Parking | Flight | Camera | null): Parking | null {
		return selectedKind === 'parking' ? (value as Parking) : null;
	}
	function flightOf(value: Place | Parking | Flight | Camera | null): Flight | null {
		return selectedKind === 'flight' ? (value as Flight) : null;
	}
	function cameraOf(value: Place | Parking | Flight | Camera | null): Camera | null {
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
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={data.siteUrl} />
	<meta
		name="robots"
		content={data.indexable ? 'index, follow, max-image-preview:large' : 'noindex, nofollow'}
	/>
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Züri City" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={data.siteUrl} />
	<meta property="og:image" content={`${data.siteUrl}android-chrome-512x512.png`} />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	{@html jsonLd}
</svelte:head>

<div class="shell" data-sensor={sensorLook}>
	<ZurichBootSplash ready={mapReady} failed={mapFailed} />
	<div class="sensor-veil" aria-hidden="true"></div>
	<ZurichCity
		bind:this={city}
		places={visibleMapPlaces}
		parkings={parkings}
		{layers}
		{intelLayers}
		{flights}
		{cameras}
		{quakes}
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
		on:error={() => {
			mapFailed = true;
		}}
	/>

	<header class="topbar">
		<a class="brand" href={resolve('/')} aria-label="Züri City home" on:click={home}>
			<img src="/favicon.svg" alt="" width="32" height="32" />
			<div>
				<p class="brand-kicker">Interactive city</p>
				<h1>Züri City</h1>
			</div>
		</a>
	</header>

	<!-- Desktop left briefing -->
	<aside class="desk-hud" aria-label="City briefing">
		<p class="eyebrow">Map</p>
		<h2>Interactive city</h2>
		<p>
			Green / amber / red streets show traffic. Toggle places and live feeds below. Parking stays on the map in blue.
		</p>
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
			<p class="hint">Move with WASD or arrows · Q/E turn · Shift hurry</p>
		{/if}
		{#if locationError}
			<p class="notice error" role="alert">{locationError}</p>
		{/if}
		{#if placesError || intelNotes[0]}
			<p class="notice" role="status">{placesError || intelNotes[0]}</p>
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
		<button type="button" class="find-aircraft" on:click={findAircraft}>
			Find aircraft · {counts.flights}
		</button>
	</aside>

	<!-- Mobile-first bottom dock: map stays full-bleed; sheet stacks above controls -->
	{#if locationError}
		<p class="mobile-alert" role="alert">{locationError}</p>
	{/if}
	{#if !parkingOpen}
	<div class="dock" aria-label="Map controls">
		{#if layersOpen}
			<div id="layer-sheet" class="layer-sheet" role="region" aria-label="Map layers">
				<div class="sheet-head">
					<p class="sheet-title">Layers</p>
					<button type="button" class="sheet-close" aria-label="Close layers" on:click={() => (layersOpen = false)}
						>Done</button
					>
				</div>
				<p class="sheet-title">Places</p>
				<div class="chip-row">
					{#each placeKeys as key (key)}
						<button
							type="button"
							class="chip"
							class:on={layers[key]}
							aria-pressed={layers[key]}
							on:click={() => togglePlaceLayer(key)}
						>
							{#if categoryIcons[key]}
								<img class="cat-icon" src={categoryIcons[key]} alt="" width="18" height="18" />
							{:else}
								<i style:background={CATEGORY_COLOR[key]}></i>
							{/if}
							{CATEGORY_LABEL[key]}
							<span>{counts[key]}</span>
						</button>
					{/each}
					<button
						type="button"
						class="chip"
						class:on={openNowOnly}
						aria-pressed={openNowOnly}
						on:click={() => (openNowOnly = !openNowOnly)}
					>
						<i style:background="#12b886"></i>
						Open now
						<span>{counts.openNow}</span>
					</button>
					<button
						type="button"
						class="chip on"
						aria-pressed="true"
						aria-label="Open parking list"
						on:click={() => setParkingOpen(true)}
					>
						<i class="parking"></i>
						Parking list
						<span>{counts.parking}</span>
					</button>
				</div>
				<p class="sheet-title">Live feeds</p>
				<div class="chip-row">
					{#each intelKeys as key (key)}
						<button
							type="button"
							class="chip"
							class:on={intelLayers[key]}
							aria-pressed={intelLayers[key]}
							on:click={() => toggleIntelLayer(key)}
						>
							<i style:background={INTEL_LAYER_COLOR[key]}></i>
							{INTEL_LAYER_LABEL[key]}
							{#if key !== 'detection'}
								<span>{counts[key] ?? ''}</span>
							{/if}
						</button>
					{/each}
				</div>
				{#if intelLayers.traffic}
					<div class="traffic-legend" aria-label="Traffic colors">
						{#each TRAFFIC_LEGEND as item (item.label)}
							<span><i style:background={item.color}></i>{item.label}</span>
						{/each}
					</div>
				{/if}
				<button type="button" class="sheet-action" on:click={findAircraft}>
					Find aircraft · {counts.flights}
				</button>
				<p class="sheet-title">View mode</p>
				<div class="chip-row sensors">
					{#each SENSOR_LOOKS as look (look.id)}
						<button
							type="button"
							class="chip"
							class:on={sensorLook === look.id}
							aria-pressed={sensorLook === look.id}
							on:click={() => (sensorLook = look.id)}>{look.label}</button
						>
					{/each}
				</div>
			</div>
		{/if}
		<div class="dock-modes">
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
					if (layersOpen) setParkingOpen(false);
				}}>Layers</button
			>
		</div>
	</div>
	{/if}

	<!-- Desktop layer rail -->
	<aside class="desk-layers" aria-label="Desktop map layers">
		<p class="eyebrow">Layers</p>
		{#each placeKeys as key (key)}
			<button
				type="button"
				class="layer"
				class:on={layers[key]}
				aria-pressed={layers[key]}
				on:click={() => togglePlaceLayer(key)}
			>
				{#if categoryIcons[key]}
					<img class="cat-icon" src={categoryIcons[key]} alt="" width="18" height="18" />
				{:else}
					<i style:background={CATEGORY_COLOR[key]}></i>
				{/if}
				<span>{CATEGORY_LABEL[key]}</span>
				<strong>{counts[key]}</strong>
			</button>
		{/each}
		<button
			type="button"
			class="layer"
			class:on={openNowOnly}
			aria-pressed={openNowOnly}
			on:click={() => (openNowOnly = !openNowOnly)}
		>
			<i style:background="#12b886"></i>
			<span>Open now</span>
			<strong>{counts.openNow}</strong>
		</button>
		<button
			type="button"
			class="layer on"
			aria-pressed="true"
			aria-label="Open parking list"
			on:click={() => setParkingOpen(true)}
		>
			<i class="parking"></i>
			<span>Parking list</span>
			<strong>{counts.parking}</strong>
		</button>
		<p class="eyebrow intel-label">Live feeds</p>
		{#each intelKeys as key (key)}
			<button
				type="button"
				class="layer"
				class:on={intelLayers[key]}
				aria-pressed={intelLayers[key]}
				on:click={() => toggleIntelLayer(key)}
			>
				<i style:background={INTEL_LAYER_COLOR[key]}></i>
				<span>{INTEL_LAYER_LABEL[key]}</span>
				<strong>{key === 'detection' ? '' : counts[key]}</strong>
			</button>
		{/each}
		{#if intelLayers.traffic}
			<div class="traffic-legend desk" aria-label="Traffic colors">
				{#each TRAFFIC_LEGEND as item (item.label)}
					<span><i style:background={item.color}></i>{item.label}</span>
				{/each}
			</div>
		{/if}
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

	<ParkingPanel
		open={parkingOpen}
		parkings={parkings}
		refreshedAt={refreshedAt}
		error={parkingError}
		{position}
		{locating}
		{locationError}
		onLocate={locate}
		onSelect={focusParking}
		onClose={() => setParkingOpen(false)}
	/>

	<footer class="credits">
		<span>SWISSIMAGE · OSM · OpenFreeMap · ADS-B · USGS · PLS Zürich</span>
		<span class="dot">·</span>
		<InstallApp />
		<span class="dot">·</span>
		<a href="https://github.com/danacr/Zuri-City">GitHub</a>
	</footer>
</div>

<style>
	.shell {
		position: relative;
		height: 100dvh;
		height: 100svh;
		overflow: hidden;
		background: #07131f;
		color: var(--text);
		font-family: 'Quicksand', 'Avenir Next', 'Segoe UI', sans-serif;
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

	/* Mobile-first dock — map remains the primary surface */
	.dock {
		position: absolute;
		z-index: 28;
		left: 10px;
		right: 10px;
		bottom: calc(40px + env(safe-area-inset-bottom));
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		gap: 8px;
		max-height: min(42vh, 340px);
		pointer-events: none;
	}
	.dock > * {
		pointer-events: auto;
	}
	.dock-modes {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 6px;
		padding: 8px;
		border-radius: 16px;
		background: color-mix(in srgb, #0b1a2a 88%, transparent);
		border: 1px solid #ffffff28;
		backdrop-filter: blur(14px);
		box-shadow: 0 12px 32px #03101855;
		flex: 0 0 auto;
	}
	.dock-modes button {
		min-height: 40px;
		border-radius: 11px;
		background: #ffffff12;
		color: #f4f7fb;
		font-weight: 750;
		font-size: 12px;
	}
	.dock-modes button.active {
		background: #1260ce;
	}

	.layer-sheet {
		flex: 1 1 auto;
		min-height: 0;
		max-height: min(32vh, 280px);
		overflow: auto;
		padding: 8px 10px 10px;
		border-radius: 14px;
		background: color-mix(in srgb, var(--surface) 94%, transparent);
		border: 1px solid var(--border);
		backdrop-filter: blur(16px);
		box-shadow: 0 16px 40px #07152655;
		-webkit-overflow-scrolling: touch;
	}
	.sheet-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin-bottom: 2px;
	}
	.sheet-head .sheet-title {
		margin: 0;
	}
	.sheet-action {
		display: block;
		width: 100%;
		min-height: 40px;
		margin: 8px 0 4px;
		border-radius: 12px;
		background: #f0b429;
		color: #1a1303;
		font-weight: 800;
		font-size: 12px;
	}
	.sheet-close {
		min-height: 32px;
		padding: 0 10px;
		border-radius: 999px;
		background: var(--accent-soft);
		color: var(--accent);
		font-size: 12px;
		font-weight: 750;
	}
	.sheet-title {
		font-size: 10px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		font-weight: 750;
		color: var(--muted);
		margin: 6px 0 4px;
	}
	.chip-row {
		display: flex;
		gap: 5px;
		overflow-x: auto;
		padding-bottom: 2px;
		scrollbar-width: none;
	}
	.chip-row::-webkit-scrollbar {
		display: none;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		flex: 0 0 auto;
		min-height: 30px;
		padding: 0 8px;
		border-radius: 999px;
		background: var(--surface-muted);
		color: var(--text);
		font-size: 11px;
		font-weight: 700;
		opacity: 0.55;
	}
	.chip.on {
		opacity: 1;
		background: var(--accent-soft);
		color: var(--accent);
	}
	.cat-icon {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		flex: 0 0 auto;
		display: block;
		object-fit: cover;
	}
	.chip i {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		flex: 0 0 auto;
	}
	.chip i.parking {
		background: #1c7ed6;
		border-radius: 2px;
	}
	.chip span {
		font-variant-numeric: tabular-nums;
		opacity: 0.8;
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
	}
	.eyebrow {
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-weight: 750;
		color: var(--muted);
	}
	.credits {
		position: absolute;
		z-index: 24;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 6px 10px calc(6px + env(safe-area-inset-bottom));
		font-size: 9px;
		color: #c9d8e8;
		background: #07131ef2;
	}
	.credits a {
		color: #9dceff;
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


	.traffic-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 12px;
		align-items: center;
		margin: 6px 0 2px;
		padding: 6px 8px;
		border-radius: 10px;
		background: color-mix(in srgb, var(--surface-muted) 85%, transparent);
		font-size: 10px;
		font-weight: 700;
		color: var(--muted);
	}
	.traffic-legend span {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}
	.traffic-legend i {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		flex: 0 0 auto;
	}
	.traffic-legend.desk {
		margin-top: 4px;
		padding: 5px 8px;
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
			left: 16px;
			top: calc(268px + env(safe-area-inset-top));
			max-height: calc(100dvh - 300px);
			overflow: auto;
			gap: 4px;
		}
		.mode-row,
		.find-aircraft,
		.sheet-action {
			margin-top: 10px;
			min-height: 40px;
			width: 100%;
			border-radius: 12px;
			background: #f0b429;
			color: #1a1303;
			font-weight: 800;
			font-size: 12px;
		}
		.sheet-action {
			margin-top: 8px;
			margin-bottom: 4px;
		}
	.sensor-row {
			display: flex;
			flex-wrap: wrap;
			gap: 8px;
			margin-top: 10px;
		}
		.mode-row button,
		.sensor-row button,
		.layer {
			min-height: 40px;
			padding: 0 12px;
			border-radius: 12px;
			background: var(--surface-muted);
			color: var(--text);
			font-weight: 700;
			font-size: 12px;
		}
		.mode-row button.active,
		.sensor-row button.active {
			background: var(--accent-button, #1260ce);
			color: #fff;
		}
		.layer {
			display: grid;
			grid-template-columns: 8px 1fr auto;
			align-items: center;
			gap: 8px;
			width: 100%;
			min-height: 32px;
			padding: 0 10px;
			text-align: left;
			opacity: 0.55;
		}
		.layer.on {
			opacity: 1;
			background: var(--accent-soft);
			color: var(--accent);
		}
		.layer .cat-icon {
			width: 18px;
			height: 18px;
			border-radius: 50%;
			object-fit: cover;
		}
		.layer i {
			width: 8px;
			height: 8px;
			border-radius: 50%;
		}
		.layer i.parking {
			background: #1c7ed6;
			border-radius: 3px;
		}
		.intel-label {
			margin-top: 8px;
		}
		.inspect {
			left: auto;
			right: 16px;
			width: min(320px, calc(100vw - 32px));
			bottom: calc(56px + env(safe-area-inset-bottom));
		}
	}

</style>
