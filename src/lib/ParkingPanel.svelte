<script lang="ts">
	import { tick } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import ParkingCard from '$lib/ParkingCard.svelte';
	import { availability, distance, type Parking } from '$lib/parking';

	export let parkings: Parking[];
	export let refreshedAt: string | null;
	export let error = '';
	export let open = false;
	export let position: [number, number] | null = null;
	export let onLocate: () => void = () => {};
	export let locating = false;
	export let locationError = '';
	export let onSelect: (parking: Parking) => void = () => {};
	export let onClose: () => void = () => {};

	let query = '';
	let searchOpen = false;
	let searchInput: HTMLInputElement;
	let refreshing = false;
	let refreshError = '';

	$: ranked = parkings
		.map((parking): Parking & { distance?: number } => ({
			...parking,
			...(position && parking.coordinates
				? { distance: distance(position, parking.coordinates) }
				: {})
		}))
		.sort((a, b) =>
			position
				? (a.distance ?? Infinity) - (b.distance ?? Infinity)
				: Number(availability(b) === 'Open') - Number(availability(a) === 'Open') ||
					(b.free ?? -1) - (a.free ?? -1)
		);
	$: visible = ranked.filter((p) =>
		`${p.name} ${p.address}`.toLowerCase().includes(query.trim().toLowerCase())
	);
	$: available = visible.filter((p) => availability(p) === 'Open');
	$: unavailable = visible.filter((p) => availability(p) !== 'Open');
	$: hidden = parkings.length - visible.length;
	$: refreshed = refreshedAt
		? new Date(refreshedAt).toLocaleTimeString('en-GB', {
				timeZone: 'Europe/Zurich',
				hour: '2-digit',
				minute: '2-digit'
			})
		: '';

	async function toggleSearch() {
		searchOpen = !searchOpen;
		if (!searchOpen) query = '';
		await tick();
		if (searchOpen) searchInput?.focus();
	}

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

	export function reset() {
		query = '';
		searchOpen = false;
		refreshError = '';
	}
</script>

{#if open}
	<aside class="parking-panel" role="region" aria-label="Parking feature">
		<header class="panel-head">
			<div>
				<p class="eyebrow">Feature</p>
				<h2>City parking</h2>
			</div>
			<div class="panel-actions">
				<button
					class="icon-btn"
					aria-label={searchOpen ? 'Close search' : 'Search garages'}
					aria-expanded={searchOpen}
					on:click={toggleSearch}
				>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
						><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg
					>
				</button>
				<button class="icon-btn" aria-label="Close parking" on:click={onClose}>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
						><path d="M6 6l12 12M18 6 6 18" /></svg
					>
				</button>
			</div>
		</header>

		{#if searchOpen}
			<label class="search">
				<input
					bind:this={searchInput}
					type="search"
					bind:value={query}
					placeholder="Search a garage or street"
					aria-label="Search garages"
					on:keydown={(event) => {
						if (event.key === 'Escape') toggleSearch();
					}}
				/>
			</label>
		{/if}

		<div class="toolbar">
			<button class="tool" on:click={onLocate} disabled={locating}>
				{locating ? 'Locating…' : position ? 'Update location' : 'Near me'}
			</button>
			<button class="tool" on:click={refresh} disabled={refreshing} aria-label="Refresh parking data">
				{refreshing ? 'Refreshing…' : refreshed ? `Refresh · ${refreshed}` : 'Refresh'}
			</button>
		</div>

		{#if error || refreshError || locationError}
			<div class="notice error" role="alert">{error || refreshError || locationError}</div>
		{/if}
		{#if hidden}
			<div class="notice" role="status">
				{visible.length} of {parkings.length} garages shown.
				<button on:click={() => (query = '')}>Show all</button>
			</div>
		{/if}

		<section class="list" aria-label="Parking garages">
			{#each available as parking (parking.id || parking.link || parking.name)}
				<div class="card-hit">
					<ParkingCard {parking} />
					<button class="focus-map" on:click={() => onSelect(parking)}>Show on map</button>
				</div>
			{:else}
				<div class="empty">
					<strong>P</strong>
					<h3>{error ? 'Parking data unavailable' : 'No available garages'}</h3>
					<p>Full or closed garages are listed below. Refresh for the latest spaces.</p>
				</div>
			{/each}
		</section>

		{#if unavailable.length}
			<section class="unavailable" aria-label="Unavailable garages">
				<h3>
					{unavailable.length} unavailable {unavailable.length === 1 ? 'garage' : 'garages'}
				</h3>
				{#each unavailable as parking (parking.id || parking.link || parking.name)}
					<div class="card-hit">
						<ParkingCard {parking} />
						<button class="focus-map" on:click={() => onSelect(parking)}>Show on map</button>
					</div>
				{/each}
			</section>
		{/if}
	</aside>
{/if}

<style>
	.parking-panel {
		position: absolute;
		z-index: 32;
		top: calc(72px + env(safe-area-inset-top));
		right: 12px;
		bottom: 12px;
		width: min(400px, calc(100vw - 24px));
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 14px;
		border-radius: 22px;
		background: color-mix(in srgb, var(--surface) 92%, transparent);
		border: 1px solid var(--border);
		backdrop-filter: blur(16px);
		box-shadow: 0 18px 50px #10233a28;
		overflow: hidden;
	}
	.panel-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
	}
	.eyebrow {
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--muted);
		font-weight: 700;
	}
	h2 {
		font-size: 22px;
		letter-spacing: -0.6px;
		font-weight: 800;
	}
	.panel-actions {
		display: flex;
		gap: 4px;
	}
	.icon-btn,
	.tool {
		min-height: 44px;
		min-width: 44px;
		display: grid;
		place-items: center;
		border-radius: 12px;
		color: var(--accent);
		background: var(--accent-soft);
	}
	.tool {
		flex: 1;
		padding: 0 12px;
		font-size: 12px;
		font-weight: 700;
	}
	.toolbar {
		display: flex;
		gap: 8px;
	}
	.search {
		display: flex;
		align-items: center;
		height: 48px;
		padding: 0 14px;
		border-radius: 12px;
		border: 1px solid var(--border);
		background: var(--surface);
	}
	input {
		width: 100%;
		border: 0;
		outline: none;
		background: transparent;
		color: var(--text);
		font-size: 16px;
	}
	.list,
	.unavailable {
		overflow: auto;
		display: grid;
		gap: 10px;
		padding-right: 2px;
	}
	.list {
		flex: 1;
	}
	.card-hit {
		display: grid;
		gap: 8px;
	}
	.focus-map {
		min-height: 40px;
		border-radius: 12px;
		background: var(--accent-soft);
		color: var(--accent);
		font-weight: 700;
		font-size: 12px;
	}
	.unavailable h3 {
		font-size: 14px;
		font-weight: 750;
		margin-bottom: 4px;
	}
	.notice {
		background: var(--accent-soft);
		color: var(--accent);
		border: 1px solid var(--border);
		padding: 12px;
		border-radius: 12px;
		font-size: 12px;
		line-height: 1.5;
	}
	.notice button {
		display: block;
		margin-top: 6px;
		font-weight: 700;
		text-decoration: underline;
		min-height: 36px;
	}
	.error {
		background: var(--red-soft);
		color: var(--red);
		border-color: var(--red-border);
	}
	.empty {
		text-align: center;
		padding: 28px 16px;
		border: 1px dashed var(--border);
		border-radius: 18px;
		background: var(--surface);
	}
	.empty strong {
		font-size: 28px;
		color: var(--accent);
	}
	.empty h3 {
		margin: 8px 0;
		font-weight: 700;
	}
	.empty p {
		color: var(--muted);
		font-size: 12px;
	}
	@media (max-width: 859px) {
		.parking-panel {
			top: auto;
			left: 0;
			right: 0;
			bottom: 0;
			width: 100%;
			height: min(46vh, 420px);
			max-height: 46vh;
			border-radius: 22px 22px 0 0;
		}
	}
</style>
