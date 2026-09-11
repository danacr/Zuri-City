<script lang="ts">
	import { tick } from 'svelte';
	import { resolve } from '$app/paths';
	import { title, description, structuredData } from '$lib/seo';
	$: jsonLd = `<script type="application/ld+json">${structuredData(data.siteUrl)}<${'/'}script>`;
	import InstallApp from '$lib/InstallApp.svelte';
	import ThemeToggle from '$lib/ThemeToggle.svelte';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';
	import ParkingMap from '$lib/ParkingMap.svelte';
	import ParkingCard from '$lib/ParkingCard.svelte';
	import { availability, distance, type Parking } from '$lib/parking';
	export let data: PageData;
	let locationMode = false;
	let locating = false;
	let locationError = '';
	let position: [number, number] | null = null;
	let request = 0;
	let query = '';
	let searchOpen = false;
	let searchInput: HTMLInputElement;
	let searchButton: HTMLButtonElement;
	async function toggleSearch() {
		searchOpen = !searchOpen;
		if (!searchOpen) query = '';
		await tick();
		if (searchOpen) searchInput.focus();
		else searchButton.focus();
	}
	let refreshing = false;
	let refreshError = '';
	$: ranked = data.parkings
		.map((parking): Parking & { distance?: number } => ({
			...parking,
			...(position && parking.coordinates
				? { distance: distance(position, parking.coordinates) }
				: {})
		}))
		.sort((a, b) =>
			locationMode && position
				? (a.distance ?? Infinity) - (b.distance ?? Infinity)
				: Number(availability(b) === 'Open') - Number(availability(a) === 'Open') ||
					(b.free ?? -1) - (a.free ?? -1)
		);
	$: visible = ranked.filter((p) =>
		`${p.name} ${p.address}`.toLowerCase().includes(query.trim().toLowerCase())
	);
	$: mapped = visible.filter(
		(p): p is Parking & { distance: number } => p.coordinates !== null && p.distance !== undefined
	);
	$: available = visible.filter((p) => availability(p) === 'Open');
	$: unavailable = visible.filter((p) => availability(p) !== 'Open');

	let greeting = 0;
	const greetings = ['Grüezi, Zürich!', 'Ab an den See.', 'Nächster Halt: Feierabend.'];
	function home(event: MouseEvent) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
			return;
		event.preventDefault();
		showList();
		query = '';
		searchOpen = false;
		locationError = '';
		window.scrollTo({ top: 0, behavior: 'auto' });
	}
	$: unmapped = available.filter((p) => !p.coordinates);
	$: hidden = data.parkings.length - visible.length;
	$: refreshed = data.refreshedAt
		? new Date(data.refreshedAt).toLocaleTimeString('en-GB', {
				timeZone: 'Europe/Zurich',
				hour: '2-digit',
				minute: '2-digit'
			})
		: '';
	async function refresh() {
		refreshing = true;
		refreshError = '';
		try {
			await invalidateAll();
		} catch {
			refreshError = 'Refresh failed. Please try again.';
		} finally {
			refreshing = false;
		}
	}
	function locate() {
		locationMode = true;
		locationError = '';
		if (!window.isSecureContext) {
			locationError =
				'Location requires HTTPS. Open this app using an HTTPS address; browsers block location on HTTP network addresses without asking for permission. You can still use List view.';
			return;
		}
		if (!navigator.geolocation) {
			locationError = 'Your browser does not support location. You can still use the parking list.';
			return;
		}
		locating = true;
		const currentRequest = ++request;
		navigator.geolocation.getCurrentPosition(
			(result) => {
				if (currentRequest !== request) return;
				position = [result.coords.latitude, result.coords.longitude];
				locating = false;
			},
			(error) => {
				if (currentRequest !== request) return;
				locating = false;
				locationError =
					error.code === 1
						? 'Location access was denied. Allow location for this website in your browser settings and try again. On iPhone, also check that Location Services are enabled for Safari Websites.'
						: error.code === 3
							? 'Finding your location timed out. Please try again.'
							: 'Your location is unavailable. Please try again.';
			},
			{ enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
		);
	}
	function showList() {
		locationMode = false;
		locating = false;
		request++;
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
	<meta property="og:type" content="website" /><meta
		property="og:site_name"
		content="Züri Parking"
	/>
	<meta property="og:title" content={title} /><meta
		property="og:description"
		content={description}
	/><meta property="og:url" content={data.siteUrl} />
	<meta property="og:image" content={`${data.siteUrl}android-chrome-512x512.png`} /><meta
		property="og:image:alt"
		content="Zürich blue and white parking emblem"
	/>
	<meta name="twitter:card" content="summary" /><meta name="twitter:title" content={title} /><meta
		name="twitter:description"
		content={description}
	/><meta name="twitter:image" content={`${data.siteUrl}android-chrome-512x512.png`} />
	{@html jsonLd}
</svelte:head>
<div class="app">
	<header class="topbar">
		<a class="brand" href={resolve('/')} aria-label="Züri City Parking home" on:click={home}
			><img src="/favicon.svg" alt="" width="32" height="32" />
			<h1>Züri Parking</h1></a
		>
		<div class="header-actions">
			<ThemeToggle />
			<button
				class="mode-toggle"
				aria-label={locationMode ? 'List view' : 'Near me · Map mode'}
				title={locationMode ? 'Switch to list' : 'Show nearby parking on map'}
				on:click={() => {
					if (locationMode) showList();
					else if (position) locationMode = true;
					else locate();
				}}
			>
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					aria-hidden="true"
					>{#if locationMode}<rect x="3" y="4" width="18" height="6" rx="2" /><rect
							x="3"
							y="14"
							width="18"
							height="6"
							rx="2"
						/>{:else}<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15" />{/if}</svg
				><span>{locationMode ? 'List' : 'Map'}</span>
			</button>
			<button
				class="search-toggle"
				bind:this={searchButton}
				aria-label={searchOpen ? 'Close search' : 'Search garages'}
				aria-expanded={searchOpen}
				aria-controls="garage-search"
				on:click={toggleSearch}
				><svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg
				></button
			>
		</div>
	</header>
	<main>
		<div id="garage-search" hidden={!searchOpen}>
			<label class="search"
				><input
					bind:this={searchInput}
					type="search"
					bind:value={query}
					placeholder="Search a garage or street"
					aria-label="Search garages"
					on:keydown={(event) => {
						if (event.key === 'Escape') toggleSearch();
					}}
				/>{#if query}<button
						class="clear"
						on:click={() => {
							query = '';
							searchInput.focus();
						}}
						aria-label="Clear search">×</button
					>{/if}</label
			>
		</div>
		{#if locationMode}
			<section class="map-section" aria-label="Parking map">
				{#if position}
					{#key `${position.join(',')}-${data.refreshedAt}-${query}`}<ParkingMap
							{position}
							parkings={mapped}
						/>{/key}
				{:else if locating}<div class="notice" role="status">Finding your location…</div>
				{:else if locationError}<div class="notice error" role="alert">
						{locationError}<button on:click={locate}>Try location again</button>
					</div>
				{:else}<div class="notice">Allow location to find parking near you.</div>{/if}
			</section>
		{:else}
			<section aria-label="Parking garages" class="results">
				<div class="cards">
					{#each available as parking (parking.id || parking.link || parking.name)}<ParkingCard
							{parking}
						/>{:else}<div class="empty">
							<span aria-hidden="true">P</span>
							<h3>{data.error ? 'Parking data unavailable' : 'No available garages'}</h3>
							<p>
								{hidden
									? 'Try a different street or clear your filters.'
									: 'See closed, full or unknown garages below, or refresh for the latest data.'}
							</p>
						</div>{/each}
				</div>
			</section>
		{/if}
		{#if unavailable.length}<section class="unavailable" aria-label="Unavailable garages">
				<h2>{unavailable.length} unavailable {unavailable.length === 1 ? 'garage' : 'garages'}</h2>
				<p>Full, closed or availability unknown.</p>
				<div class="cards">
					{#each unavailable as parking (parking.id || parking.link || parking.name)}<ParkingCard
							{parking}
						/>{/each}
				</div>
			</section>{/if}

		{#if locationMode && unmapped.length}<section
				class="unavailable"
				aria-label="Garages without map locations"
			>
				<h2>
					{unmapped.length}
					{unmapped.length === 1 ? 'garage' : 'garages'} without a map location
				</h2>
				<div class="cards">
					{#each unmapped as parking (parking.id || parking.link || parking.name)}<ParkingCard
							{parking}
						/>{/each}
				</div>
			</section>{/if}

		<section class="page-details" aria-label="Parking information">
			<div class="feed-status">
				<span
					>{data.parkings.length} garages{#if refreshed}
						· Checked {refreshed}{/if}</span
				><button on:click={refresh} disabled={refreshing} aria-label="Refresh parking data"
					><span aria-hidden="true" class:spinning={refreshing}>↻</span>{refreshing
						? 'Refreshing…'
						: 'Refresh'}</button
				>
			</div>
			{#if data.error || refreshError}<div class="notice error" role="alert">
					{data.error || refreshError}
				</div>{/if}
			{#if hidden}<div class="notice filtered" role="status">
					<span
						><strong>{visible.length} of {data.parkings.length} garages shown.</strong>
						{hidden} hidden by your search.</span
					><button on:click={() => (query = '')}>Show all</button>
				</div>{/if}

			{#if locationMode && position}
				<p class="map-note">
					{mapped.length} of {visible.length} shown garages on the map. Pan to explore further away.
				</p>
				<button class="text-button" on:click={locate} disabled={locating}>Locate again ↗</button>
				{#if locationError}<p class="notice error" role="alert">{locationError}</p>{/if}
				{#if locating}<p role="status">Updating your location…</p>{/if}
				<div class="legend">
					<span><i class="green"></i>Open</span><span><i class="red"></i>Full / closed</span><span
						><i class="grey"></i>Unknown</span
					>
				</div>
				<p class="privacy">
					Your location stays in your browser. Distances are straight-line estimates. Garages
					without coordinates are available in List view.
				</p>
			{/if}
			<div class="install-row"><InstallApp labeled /></div>
		</section>
		<footer>
			<div class="zurich-detail" aria-hidden="true">
				<svg viewBox="0 0 280 44" fill="none" stroke="currentColor" stroke-width="1.5"
					><path
						d="M0 38h34V23h14v15h20V14h9V7l4-5 4 5v7h9v24h12V14h9V7l4-5 4 5v7h9v24h26V20h10v18h22V12l6-9 6 9v26h22V25h25v13h31M0 43q20-6 40 0t40 0t40 0t40 0t40 0t40 0t40 0"
					/></svg
				>
			</div>
			<button
				class="zurich-greeting"
				title="A little Zürich greeting"
				on:click={() => (greeting = (greeting + 1) % greetings.length)}
				>{greetings[greeting]}</button
			>
			<h2>Parking in Zürich, made a little easier.</h2>
			<p class="about">
				Find parking garages in Zürich with current free spaces, total capacity and directions.
				Explore nearby parking on the map, from the city centre to Oerlikon. Full, closed and
				unknown garages are listed separately.
			</p>
			<dl>
				<div>
					<dt>Parking data</dt>
					<dd>
						<a href="https://www.pls-zh.ch/">PLS Parkleitsystem Zürich ↗</a><span
							>Availability, garage capacity and locations. Retrieved on each refresh.</span
						>
					</dd>
				</div>
				<div>
					<dt>Maps</dt>
					<dd>
						<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors ↗</a
						><span>Interactive maps by <a href="https://leafletjs.com/">Leaflet</a>.</span>
					</dd>
				</div>
				<div>
					<dt>Project</dt>
					<dd>
						<a href="https://github.com/danacr/Zuri-City">Züri Parking on GitHub ↗</a><span
							>Thanks to <a href="https://github.com/danacr/Zuri-City/graphs/contributors"
								>our contributors</a
							>. View the source, contribute or
							<a href="https://github.com/danacr/Zuri-City/issues">report an issue</a>.</span
						>
					</dd>
				</div>
			</dl>
			<p>
				© {new Date().getFullYear()} Züri Parking · Built by <a href="https://dan.cv">dan.cv</a>.
			</p>
			<p>Independent community project. Availability can change before you arrive.</p>
		</footer>
	</main>
</div>

<style>
	.mode-toggle {
		display: flex !important;
		width: auto !important;
		gap: 5px;
		padding: 0 10px;
		font-size: 12px;
		font-weight: 750;
	}
	.unavailable {
		margin-top: 28px;
	}
	.unavailable > h2 {
		font-size: 17px;
		font-weight: 750;
	}
	.unavailable > p {
		color: var(--muted);
		font-size: 12px;
		margin: 6px 0 14px;
	}
	.zurich-detail {
		max-width: 280px;
		color: var(--accent);
		opacity: 0.6;
		margin-bottom: 12px;
	}
	.zurich-greeting {
		min-height: 44px;
		color: var(--accent);
		font-weight: 750;
		font-size: 15px;
	}
	footer .about {
		font-size: 12px;
		margin: 0 0 20px;
	}
	@media (max-width: 360px) {
		.app {
			padding-left: 14px !important;
			padding-right: 14px !important;
		}
		h1 {
			font-size: 18px !important;
		}
		.brand {
			gap: 6px !important;
		}
	}

	#garage-search:not([hidden]) {
		margin-bottom: 12px;
	}
	.page-details {
		margin-top: 24px;
	}
	.search-toggle[aria-expanded='true'] {
		background: var(--accent-soft);
	}

	.feed-status {
		margin-bottom: 16px;
	}
	.install-row {
		margin-top: 18px;
	}
	.app {
		max-width: 1040px;
		margin: auto;
		padding: 0 20px;
	}
	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		min-height: 72px;
		padding-top: env(safe-area-inset-top);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 9px;
		text-decoration: none;
		min-width: 0;
	}
	h1 {
		font-size: 20px;
		font-weight: 800;
		letter-spacing: -0.6px;
		white-space: nowrap;
	}
	.header-actions {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.search-toggle,
	.mode-toggle {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		color: var(--accent);
		border-radius: 12px;
	}

	.feed-status {
		border-bottom: 1px solid var(--border);
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 11px;
		color: var(--muted);
		padding: 0 0 6px;
		gap: 8px;
	}
	.feed-status button {
		display: flex;
		align-items: center;
		gap: 5px;
		min-height: 44px;
		font-weight: 650;
		color: var(--accent);
	}
	.feed-status button > span {
		font-size: 22px;
	}
	.search {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 0 14px;
		height: 54px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 13px;
		color: var(--muted);
	}
	input {
		flex: 1;
		min-width: 0;
		color: var(--text);
		background: transparent;
		border: 0;
		outline: none;
		font-size: 16px;
		padding: 0;
	}
	input::placeholder {
		color: var(--muted);
	}
	.search:focus-within {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px #0072ce14;
	}
	.clear {
		min-width: 44px;
		min-height: 44px;
		font-size: 23px;
	}
	.notice {
		background: var(--accent-soft);
		color: var(--accent);
		border: 1px solid var(--border);
		padding: 15px;
		border-radius: 12px;
		font-size: 13px;
		margin-bottom: 18px;
		line-height: 1.6;
	}
	.notice button {
		min-height: 44px;
		text-decoration: underline;
		display: block;
		font-weight: 700;
	}
	.error {
		background: var(--red-soft);
		color: var(--red);
		border-color: var(--red-border);
	}
	.filtered {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}
	.filtered button {
		flex-shrink: 0;
	}
	h2 {
		font-size: 19px;
		font-weight: 750;
		letter-spacing: -0.5px;
	}
	.cards {
		display: grid;
		gap: 12px;
	}
	.map-note,
	.privacy {
		font-size: 11px;
		color: var(--muted);
		line-height: 1.6;
		margin: 8px 0 12px;
	}
	.privacy {
		margin: 0 0 24px;
	}
	.text-button {
		color: var(--accent);
		font-size: 12px;
		min-height: 44px;
	}
	.legend {
		display: flex;
		gap: 16px;
		align-items: center;
		padding: 12px 0;
		color: var(--muted);
		font-size: 10px;
	}
	.legend span {
		display: flex;
		align-items: center;
		gap: 5px;
	}
	.legend i {
		width: 7px;
		height: 7px;
		border-radius: 50%;
	}
	.green {
		background: var(--green);
	}
	.red {
		background: var(--red);
	}
	.grey {
		background: var(--muted);
	}
	.empty {
		text-align: center;
		padding: 40px 20px;
		background: var(--surface);
		border: 1px dashed var(--border);
		border-radius: 20px;
	}
	.empty > span {
		color: var(--accent);
		font-size: 36px;
		font-weight: 800;
	}
	.empty h3 {
		font-weight: 700;
		margin: 10px;
	}
	.empty p {
		color: var(--muted);
		font-size: 13px;
	}
	footer {
		padding: 28px 0 max(24px, env(safe-area-inset-bottom));
		font-size: 11px;
		color: var(--muted);
		line-height: 1.7;
	}
	footer h2 {
		font-size: 14px;
		margin-bottom: 16px;
		color: var(--text);
	}
	footer dl {
		display: grid;
		gap: 14px;
	}
	footer dl > div {
		display: grid;
		grid-template-columns: 76px 1fr;
		gap: 8px;
	}
	footer dt {
		font-weight: 650;
		color: var(--text);
	}
	footer dd > span {
		display: block;
		margin-top: 3px;
	}
	footer a {
		color: var(--accent);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	footer > p {
		margin-top: 20px;
		font-size: 10px;
	}
	button:disabled {
		opacity: 0.55;
	}
	.spinning {
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@media (min-width: 700px) {
		.app {
			padding: 0 36px;
		}
		.cards {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 18px;
		}
		.search {
			flex: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.spinning {
			animation: none;
		}
	}
</style>
