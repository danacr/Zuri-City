<script lang="ts">
	import type { PageData } from './$types';
	import ParkingMap from '$lib/ParkingMap.svelte';
	import { availability, distance } from '$lib/parking';
	export let data: PageData;
	let locationMode = false;
	let locating = false;
	let locationError = '';
	let position: [number, number] | null = null;
	let request = 0;
	$: openParkings = data.parkings
		.filter((p) => p.status === 'open')
		.sort((a, b) => (b.free ?? -1) - (a.free ?? -1));
	$: nearby = position
		? data.parkings
				.filter((p) => p.coordinates)
				.map((p) => ({ ...p, distance: distance(position!, p.coordinates!) }))
				.sort((a, b) => a.distance - b.distance)
				.slice(0, 10)
		: [];
	$: missingCoordinates = data.parkings.filter((p) => !p.coordinates).length;
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

<svelte:head><title>Züri City Parking Spots</title></svelte:head>
<main>
	<header>
		<h1>Züri City Parking Spots</h1>
		<p>Find parking and tap a garage to start navigation.</p>
		<div class="controls">
			<button class:active={!locationMode} aria-pressed={!locationMode} on:click={showList}
				>List view</button
			>
			<button
				class:active={locationMode}
				aria-pressed={locationMode}
				disabled={locating}
				on:click={locate}>{locating ? 'Finding your location…' : 'Near me · Location mode'}</button
			>
		</div>
	</header>
	{#if data.error}<p role="alert">{data.error}</p>{/if}
	{#if locationMode}
		<p class="hint">
			Location mode needs permission to use your location. Your location stays in this browser.
		</p>
		{#if locationError}<p role="alert">{locationError}</p>{/if}
		{#if locating}<p role="status">Finding nearby parking…</p>{/if}
		{#if position}
			<h2>Nearest parking garages</h2>
			<p class="hint">
				Up to 10 garages, ordered by straight-line distance. Green: free spaces · Red: full · Grey:
				closed or unknown.
			</p>
			{#key position}<ParkingMap {position} parkings={nearby} />{/key}
			{#if missingCoordinates}<p class="hint">
					{missingCoordinates} garages have no map location and are omitted.
				</p>{/if}
			<ul>
				{#each nearby as parking}
					<li>
						<a href={parking.directions}
							>{parking.name}<small>{parking.distance.toFixed(1)} km away</small></a
						><span class:full={availability(parking) === 'Full'}>{availability(parking)}</span>
					</li>
				{:else}<li>No parking locations are available.</li>{/each}
			</ul>
		{/if}
	{:else}
		<table>
			<thead><tr><th>Parking</th><th>Status</th></tr></thead><tbody>
				{#each openParkings as parking}<tr
						><td><a href={parking.directions}>{parking.name}</a></td><td
							><a href={parking.link}>{availability(parking)}</a></td
						></tr
					>
				{:else}<tr><td colspan="2">No open parking garages are available.</td></tr>{/each}
			</tbody>
		</table>
	{/if}
	<footer>
		Data: <a href="https://www.pls-zh.ch/">pls-zh.ch</a> ·
		<a href="https://github.com/danacr/zuri-parking">GitHub</a>
	</footer>
</main>

<style>
	main {
		max-width: 900px;
		margin: auto;
		padding: 1rem;
	}
	header {
		text-align: center;
		margin-bottom: 1.5rem;
	}
	h1 {
		font-size: 1.5rem;
		font-weight: bold;
	}
	h2 {
		font-size: 1.2rem;
		font-weight: bold;
	}
	.controls {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 1rem;
	}
	button {
		padding: 0.65rem 1rem;
		border: 1px solid #94a3b8;
		border-radius: 8px;
	}
	button.active {
		background: #2563eb;
		color: white;
	}
	button:disabled {
		opacity: 0.6;
	}
	.hint {
		font-size: 0.85rem;
		margin: 0.75rem 0;
	}
	[role='alert'] {
		padding: 1rem;
		background: #7f1d1d;
		color: white;
		border-radius: 8px;
		margin-bottom: 1rem;
	}
	table {
		width: 100%;
	}
	th,
	td {
		text-align: left;
		padding: 0.8rem 0.5rem;
		border-bottom: 1px solid #94a3b84d;
	}
	li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 1rem 0;
		border-bottom: 1px solid #94a3b84d;
	}
	small {
		display: block;
		opacity: 0.75;
	}
	.full {
		background: #b91c1c;
		color: white;
		padding: 0.2rem 0.6rem;
		border-radius: 1rem;
	}
	footer {
		text-align: center;
		margin-top: 2rem;
		font-size: 0.85rem;
	}
	a:hover {
		text-decoration: underline;
	}
</style>
