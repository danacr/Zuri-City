<script lang="ts">
	import { resolve } from '$app/paths';
	import { title, description, structuredData } from '$lib/seo';
	$: jsonLd = `<script type="application/ld+json">${structuredData(data.siteUrl)}<${'/'}script>`;
	import InstallApp from '$lib/InstallApp.svelte';
	import ThemeToggle from '$lib/ThemeToggle.svelte';
	import ZurichCity from '$lib/city/ZurichCity.svelte';
	import ParkingPanel from '$lib/ParkingPanel.svelte';
	import {
		CATEGORY_LABEL,
		type Place,
		type PlaceCategory
	} from '$lib/city/places';
	import type { Parking } from '$lib/parking';
	import type { PageData } from './$types';

	export let data: PageData;

	let mode: 'orbit' | 'walk' = 'orbit';
	let parkingOpen = false;
	let selected: Place | Parking | null = null;
	let selectedKind: 'place' | 'parking' | null = null;
	let city: ZurichCity;
	let position: [number, number] | null = null;
	let locating = false;
	let locationError = '';
	let request = 0;
	let layers: Record<PlaceCategory | 'parking', boolean> = {
		attraction: true,
		restaurant: true,
		shop: true,
		parking: false
	};
	let hudVisible = true;
	const layerKeys: PlaceCategory[] = ['attraction', 'restaurant', 'shop'];

	$: counts = {
		attraction: data.places.filter((p) => p.category === 'attraction').length,
		restaurant: data.places.filter((p) => p.category === 'restaurant').length,
		shop: data.places.filter((p) => p.category === 'shop').length,
		parking: data.parkings.length
	};

	function home(event: MouseEvent) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
			return;
		event.preventDefault();
		selected = null;
		selectedKind = null;
		setParkingOpen(false);
		mode = 'orbit';
		city?.flyHome();
	}

	function toggleParking() {
		setParkingOpen(!parkingOpen);
	}

	function setParkingOpen(value: boolean) {
		parkingOpen = value;
		layers = { ...layers, parking: value };
		if (!value && selectedKind === 'parking') {
			selected = null;
			selectedKind = null;
		}
	}

	function toggleLayer(key: PlaceCategory) {
		layers = { ...layers, [key]: !layers[key] };
	}

	function onSelect(event: CustomEvent<{ id: string; kind: 'place' | 'parking' }>) {
		const { id, kind } = event.detail;
		if (kind === 'parking') {
			const parking = data.parkings.find((item) => (item.id || item.name) === id) || null;
			selected = parking;
			selectedKind = parking ? 'parking' : null;
			if (parking) {
				setParkingOpen(true);
			}
			return;
		}
		const place = data.places.find((item) => item.id === id) || null;
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

	function placeOf(value: Place | Parking | null): Place | null {
		return selectedKind === 'place' ? (value as Place) : null;
	}
	function parkingOf(value: Place | Parking | null): Parking | null {
		return selectedKind === 'parking' ? (value as Parking) : null;
	}
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
	<meta property="og:image:alt" content="Züri City emblem" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={`${data.siteUrl}android-chrome-512x512.png`} />
	{@html jsonLd}
</svelte:head>

<div class="shell">
	<div class="sky" aria-hidden="true"></div>
	<ZurichCity
		bind:this={city}
		places={data.places}
		parkings={data.parkings}
		{layers}
		{mode}
		selectedId={selectedKind === 'place'
			? placeOf(selected)?.id || null
			: selectedKind === 'parking'
				? parkingOf(selected)?.id || parkingOf(selected)?.name || null
				: null}
		userPosition={position}
		on:select={onSelect}
	/>

	<header class="topbar">
		<a class="brand" href={resolve('/')} aria-label="Züri City home" on:click={home}>
			<img src="/favicon.svg" alt="" width="34" height="34" />
			<div>
				<p class="brand-kicker">Virtual Zürich</p>
				<h1>Züri City</h1>
			</div>
		</a>
		<div class="header-actions">
			<ThemeToggle />
			<button
				type="button"
				class="parking-toggle"
				class:active={parkingOpen}
				aria-pressed={parkingOpen}
				aria-label={parkingOpen ? 'Hide parking feature' : 'Show parking feature'}
				title="Toggle parking"
				on:click={toggleParking}
			>
				<span class="p-badge">P</span>
				<span>Parking</span>
			</button>
		</div>
	</header>

	{#if hudVisible}
		<div class="hud" aria-label="City controls">
			<section class="panel intro">
				<p class="eyebrow">God’s-eye Zürich</p>
				<h2>Walk the city in 3D</h2>
				<p>
					Orbit above the rooftops, then drop into street level. Open stores, restaurants and
					attractions stay pinned on the map — parking is one tap away when you need it.
				</p>
				<div class="mode-row">
					<button
						class:active={mode === 'orbit'}
						aria-pressed={mode === 'orbit'}
						on:click={() => (mode = 'orbit')}>Orbit</button
					>
					<button
						class:active={mode === 'walk'}
						aria-pressed={mode === 'walk'}
						on:click={() => (mode = 'walk')}>Walk</button
					>
					<button on:click={locate} disabled={locating}
						>{locating ? 'Locating…' : 'Locate me'}</button
					>
				</div>
				{#if mode === 'walk'}
					<p class="hint">Move with WASD or arrows · turn with Q / E · hold Shift to hurry</p>
				{/if}
				{#if locationError}
					<p class="notice error" role="alert">{locationError}</p>
				{/if}
				{#if data.placesError}
					<p class="notice" role="status">{data.placesError}</p>
				{/if}
			</section>

			<section class="panel layers" aria-label="Map layers">
				<p class="eyebrow">Layers</p>
				{#each layerKeys as key (key)}
					<button
						class="layer"
						class:on={layers[key]}
						aria-pressed={layers[key]}
						on:click={() => toggleLayer(key)}
					>
						<i
							style:background={key === 'attraction'
								? '#c45c26'
								: key === 'restaurant'
									? '#0f7a5a'
									: '#1260ce'}
						></i>
						<span>{CATEGORY_LABEL[key]}</span>
						<strong>{counts[key]}</strong>
					</button>
				{/each}
				<button
					class="layer"
					class:on={layers.parking}
					aria-pressed={layers.parking}
					on:click={toggleParking}
				>
					<i class="parking"></i>
					<span>Parking garages</span>
					<strong>{counts.parking}</strong>
				</button>
			</section>
		</div>
	{/if}

	<button
		class="hud-toggle"
		aria-label={hudVisible ? 'Hide city panel' : 'Show city panel'}
		aria-pressed={hudVisible}
		on:click={() => (hudVisible = !hudVisible)}>{hudVisible ? 'Hide UI' : 'Show UI'}</button
	>

	{#if selected && selectedKind === 'place'}
		{@const place = placeOf(selected)}
		{#if place}
			<article class="inspect" aria-label={place.name}>
				<button class="close" aria-label="Close place" on:click={() => (selected = null)}>×</button>
				<p class="eyebrow">{CATEGORY_LABEL[place.category]}</p>
				<h3>{place.name}</h3>
				<p>{place.subtitle}</p>
				<p class="open-hint">{place.openHint}</p>
				<!-- eslint-disable svelte/no-navigation-without-resolve -->
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
			<article class="inspect parking" aria-label={parking.name}>
				<button class="close" aria-label="Close garage" on:click={() => (selected = null)}>×</button>
				<p class="eyebrow">Parking</p>
				<h3>{parking.name.replace(/^Parkhaus\s+/, '')}</h3>
				<p>{parking.address || 'Address unavailable'}</p>
				<p class="open-hint">
					{parking.free ?? '—'} free / {parking.capacity ?? '—'} total · {parking.status || 'unknown'}
				</p>
				<!-- eslint-disable svelte/no-navigation-without-resolve -->
				<a href={parking.directions}>Directions ↗</a>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			</article>
		{/if}
	{/if}

	<ParkingPanel
		open={parkingOpen}
		parkings={data.parkings}
		refreshedAt={data.refreshedAt}
		error={data.error}
		{position}
		{locating}
		{locationError}
		onLocate={locate}
		onSelect={focusParking}
		onClose={() => setParkingOpen(false)}
	/>

	<footer class="credits">
		<span>Map © OpenStreetMap · 3D tiles OpenFreeMap · Parking PLS Zürich</span>
		<span class="dot">·</span>
		<InstallApp />
		<span class="dot">·</span>
		<a href="https://github.com/danacr/Zuri-City">GitHub</a>
		<span class="dot">·</span>
		<a href="https://dan.cv">dan.cv</a>
	</footer>
</div>

<style>
	.shell {
		position: relative;
		min-height: 100vh;
		min-height: 100svh;
		overflow: hidden;
		background: #0b1a2a;
		color: var(--text);
		font-family: 'Quicksand', 'Avenir Next', 'Segoe UI', sans-serif;
	}
	.sky {
		pointer-events: none;
		position: absolute;
		inset: 0;
		z-index: 1;
		background:
			radial-gradient(ellipse 80% 45% at 50% -10%, #7eb6ff55, transparent 60%),
			linear-gradient(180deg, #0b1a2a00 55%, #0b1a2a33 100%);
	}
	.topbar {
		position: absolute;
		z-index: 20;
		top: 0;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: calc(10px + env(safe-area-inset-top)) 16px 10px;
		background: linear-gradient(180deg, #0b1a2acc, transparent);
		pointer-events: none;
	}
	.topbar > * {
		pointer-events: auto;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 10px;
		text-decoration: none;
		color: #f4f7fb;
		min-width: 0;
	}
	.brand-kicker {
		font-size: 10px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		opacity: 0.75;
		font-weight: 700;
	}
	h1 {
		font-size: clamp(22px, 4vw, 30px);
		font-weight: 800;
		letter-spacing: -0.04em;
		line-height: 1;
	}
	.header-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.parking-toggle {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		padding: 0 12px 0 8px;
		border-radius: 999px;
		background: #ffffff18;
		color: #f4f7fb;
		border: 1px solid #ffffff33;
		font-weight: 750;
		font-size: 13px;
		backdrop-filter: blur(10px);
		transition:
			background 0.25s ease,
			border-color 0.25s ease,
			transform 0.25s ease;
	}
	.parking-toggle.active {
		background: #1260ce;
		border-color: #7eb6ff;
		transform: translateY(-1px);
	}
	.p-badge {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 9px;
		background: #f4f7fb;
		color: #1260ce;
		font-weight: 800;
	}
	.parking-toggle.active .p-badge {
		background: #031427;
		color: #9dceff;
	}
	.hud {
		position: absolute;
		z-index: 15;
		left: 16px;
		top: calc(78px + env(safe-area-inset-top));
		width: min(360px, calc(100vw - 32px));
		display: grid;
		gap: 10px;
		animation: rise 0.7s ease both;
	}
	.panel {
		padding: 16px;
		border-radius: 20px;
		background: color-mix(in srgb, var(--surface) 88%, transparent);
		border: 1px solid var(--border);
		backdrop-filter: blur(16px);
		box-shadow: 0 16px 40px #07152633;
	}
	.intro h2 {
		font-size: 24px;
		letter-spacing: -0.04em;
		font-weight: 800;
		margin: 4px 0 8px;
	}
	.intro > p {
		color: var(--muted);
		font-size: 13px;
		line-height: 1.55;
	}
	.eyebrow {
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-weight: 750;
		color: var(--muted);
	}
	.mode-row {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 14px;
	}
	.mode-row button,
	.layer {
		min-height: 42px;
		padding: 0 12px;
		border-radius: 12px;
		background: var(--surface-muted);
		color: var(--text);
		font-weight: 700;
		font-size: 12px;
	}
	.mode-row button.active {
		background: var(--accent-button);
		color: #fff;
	}
	.hint {
		margin-top: 10px;
		font-size: 11px;
		color: var(--muted);
	}
	.layers {
		display: grid;
		gap: 8px;
	}
	.layer {
		display: grid;
		grid-template-columns: 12px 1fr auto;
		align-items: center;
		gap: 10px;
		width: 100%;
		text-align: left;
		opacity: 0.55;
	}
	.layer.on {
		opacity: 1;
		background: var(--accent-soft);
		color: var(--accent);
	}
	.layer i {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}
	.layer i.parking {
		background: #1260ce;
		border-radius: 3px;
	}
	.layer strong {
		font-variant-numeric: tabular-nums;
	}
	.hud-toggle {
		position: absolute;
		z-index: 15;
		left: 16px;
		bottom: calc(52px + env(safe-area-inset-bottom));
		min-height: 40px;
		padding: 0 12px;
		border-radius: 999px;
		background: #0b1a2acc;
		color: #f4f7fb;
		border: 1px solid #ffffff33;
		font-size: 12px;
		font-weight: 700;
		backdrop-filter: blur(8px);
	}
	.inspect {
		position: absolute;
		z-index: 18;
		right: 16px;
		bottom: calc(56px + env(safe-area-inset-bottom));
		width: min(320px, calc(100vw - 32px));
		padding: 16px 18px;
		border-radius: 18px;
		background: color-mix(in srgb, var(--surface) 92%, transparent);
		border: 1px solid var(--border);
		backdrop-filter: blur(14px);
		box-shadow: 0 16px 36px #07152640;
		animation: rise 0.35s ease both;
	}
	.inspect h3 {
		font-size: 20px;
		font-weight: 800;
		letter-spacing: -0.03em;
		margin: 4px 0 8px;
	}
	.inspect p {
		color: var(--muted);
		font-size: 13px;
		line-height: 1.5;
	}
	.open-hint {
		margin: 10px 0 12px !important;
		color: var(--text) !important;
		font-weight: 650;
	}
	.inspect a {
		color: var(--accent);
		font-weight: 700;
		font-size: 13px;
		text-decoration: none;
	}
	.close {
		position: absolute;
		top: 8px;
		right: 8px;
		width: 40px;
		height: 40px;
		font-size: 22px;
		color: var(--muted);
	}
	.credits {
		position: absolute;
		z-index: 20;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 8px 12px calc(8px + env(safe-area-inset-bottom));
		font-size: 10px;
		color: #d7e4f3;
		background: #0b1a2ae6;
	}
	.credits a {
		color: #9dceff;
	}
	.dot {
		opacity: 0.5;
	}
	.notice {
		margin-top: 10px;
		padding: 10px 12px;
		border-radius: 10px;
		background: var(--accent-soft);
		color: var(--accent);
		font-size: 12px;
		line-height: 1.45;
	}
	.error {
		background: var(--red-soft);
		color: var(--red);
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	@media (max-width: 720px) {
		.hud {
			width: calc(100vw - 24px);
			left: 12px;
			max-height: 42vh;
			overflow: auto;
		}
		.inspect {
			left: 12px;
			right: 12px;
			width: auto;
			bottom: calc(64px + env(safe-area-inset-bottom));
		}
		.parking-toggle span:last-child {
			display: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.hud,
		.inspect,
		.parking-toggle {
			animation: none;
			transition: none;
		}
	}
</style>
