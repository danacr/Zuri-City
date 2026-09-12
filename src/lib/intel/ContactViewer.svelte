<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { Camera, Flight } from './types';

	export let camera: Camera | null = null;
	export let flight: Flight | null = null;
	export let onClose: () => void = () => {};

	let bust = Date.now();
	let refreshTimer: ReturnType<typeof setInterval> | undefined;

	$: title = camera?.name || flight?.callsign || 'Contact';
	$: stamp = new Date().toLocaleTimeString('en-GB', {
		timeZone: 'Europe/Zurich',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	});
	$: liveImage =
		camera?.imageUrl && !camera.modeled
			? `${camera.imageUrl}${camera.imageUrl.includes('?') ? '&' : '?'}t=${bust}`
			: camera?.imageUrl;

	$: if (camera && !camera.modeled && camera.imageUrl) {
		if (refreshTimer) clearInterval(refreshTimer);
		bust = Date.now();
		refreshTimer = setInterval(() => {
			bust = Date.now();
		}, 4000);
	} else if (refreshTimer) {
		clearInterval(refreshTimer);
		refreshTimer = undefined;
	}

	onDestroy(() => {
		if (refreshTimer) clearInterval(refreshTimer);
	});
</script>

{#if camera || flight}
	<aside class="viewer" aria-label={camera ? 'Camera view' : 'Aircraft track'}>
		<header>
			<div>
				<p class="eyebrow">{camera ? 'Camera' : 'Aircraft'}</p>
				<h3>{title}</h3>
			</div>
			<button type="button" aria-label="Close viewer" on:click={onClose}>×</button>
		</header>

		{#if camera}
			<div class="frame" class:empty={!liveImage}>
				{#if liveImage}
					<img src={liveImage} alt={`View from ${camera.name}`} />
					<span class="badge">{camera.modeled ? 'Modeled' : 'Live'}</span>
				{:else}
					<div class="placeholder">
						<strong>No live feed</strong>
						<p>{camera.note}</p>
					</div>
					<span class="badge">Modeled</span>
				{/if}
			</div>
			<dl>
				<div><dt>Kind</dt><dd>{camera.kind}</dd></div>
				<div><dt>Bearing</dt><dd>{camera.bearing}°</dd></div>
				<div><dt>Stamp</dt><dd>{stamp}</dd></div>
			</dl>
		{/if}

		{#if flight}
			<div class="frame telemetry">
				<div class="placeholder flight">
					<strong>{flight.callsign}</strong>
					<p>
						{flight.altitudeFt == null ? 'ALT —' : `${flight.altitudeFt.toLocaleString()} ft`} ·
						{flight.speedKts == null ? 'GS —' : `${Math.round(flight.speedKts)} kts`} ·
						{flight.heading == null ? 'HDG —' : `HDG ${Math.round(flight.heading)}°`}
					</p>
					<p class="sub">
						{flight.onGround ? 'On ground' : 'Airborne'} · ADS-B
						{flight.typeCode ? ` · ${flight.typeCode}` : ''}
					</p>
				</div>
				<span class="badge">Track</span>
			</div>
			<dl>
				<div><dt>Position</dt><dd>{flight.lat.toFixed(4)}, {flight.lon.toFixed(4)}</dd></div>
				<div><dt>Stamp</dt><dd>{stamp}</dd></div>
			</dl>
		{/if}
	</aside>
{/if}

<style>
	.viewer {
		position: absolute;
		z-index: 26;
		right: 12px;
		top: calc(64px + env(safe-area-inset-top));
		width: min(260px, calc(100vw - 20px));
		display: grid;
		gap: 6px;
		padding: 8px;
		border-radius: 12px;
		background: color-mix(in srgb, #07141f 90%, transparent);
		border: 1px solid #3d5a7388;
		backdrop-filter: blur(12px);
		color: #e8f1fa;
		box-shadow: 0 12px 28px #03101855;
	}
	header {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		align-items: flex-start;
	}
	.eyebrow {
		font-size: 9px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-weight: 750;
		color: #8fd0ff;
	}
	h3 {
		font-size: 14px;
		font-weight: 800;
		letter-spacing: -0.02em;
		line-height: 1.2;
		margin-top: 1px;
	}
	header button {
		width: 28px;
		height: 28px;
		font-size: 18px;
		color: #9db4c8;
		flex: 0 0 auto;
	}
	.frame {
		position: relative;
		overflow: hidden;
		border-radius: 8px;
		aspect-ratio: 16 / 9;
		max-height: 110px;
		background: #0a1520;
		border: 1px solid #2d4558;
	}
	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
		display: block;
		filter: contrast(1.05) saturate(0.9);
	}
	.placeholder {
		height: 100%;
		display: grid;
		place-content: center;
		gap: 2px;
		padding: 8px;
		text-align: center;
		background: radial-gradient(circle at 50% 40%, #1a3348, #071018);
	}
	.placeholder strong {
		letter-spacing: 0.06em;
		font-size: 11px;
		color: #8fd0ff;
	}
	.placeholder p {
		font-size: 11px;
		color: #9db4c8;
		line-height: 1.35;
		margin: 0;
	}
	.sub {
		margin-top: 2px;
		font-size: 10px !important;
		letter-spacing: 0.04em;
		color: #3dd68c !important;
	}
	.badge {
		position: absolute;
		top: 6px;
		left: 6px;
		padding: 2px 6px;
		border-radius: 4px;
		background: #031018cc;
		border: 1px solid #8fd0ff55;
		font-size: 9px;
		font-weight: 750;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #8fd0ff;
	}
	dl {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4px 8px;
		font-size: 10px;
		margin: 0;
	}
	dt {
		color: #7f96aa;
		font-weight: 650;
	}
	dd {
		font-variant-numeric: tabular-nums;
		margin: 1px 0 0;
	}
	@media (max-width: 859px) {
		.viewer {
			left: 10px;
			right: 10px;
			width: auto;
			top: auto;
			bottom: calc(100px + env(safe-area-inset-bottom));
			max-height: min(34vh, 260px);
			overflow: auto;
		}
		.frame {
			max-height: 96px;
		}
	}
</style>
