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
	<aside class="viewer" aria-label={camera ? 'CCTV viewer' : 'Aircraft track'}>
		<header>
			<div>
				<p class="eyebrow">{camera ? 'CCTV MESH' : 'AIR TRACK'}</p>
				<h3>{title}</h3>
			</div>
			<button type="button" aria-label="Close viewer" on:click={onClose}>×</button>
		</header>

		{#if camera}
			<div class="frame" class:empty={!liveImage}>
				{#if liveImage}
					<img src={liveImage} alt={`View from ${camera.name}`} />
					<span class="badge">{camera.modeled ? 'MODELED VIEW' : 'LIVE'}</span>
				{:else}
					<div class="placeholder">
						<strong>NO LIVE FEED</strong>
						<p>Pose estimated · {camera.note}</p>
					</div>
					<span class="badge">MODELED</span>
				{/if}
				<div class="scan" aria-hidden="true"></div>
			</div>
			<dl>
				<div><dt>Kind</dt><dd>{camera.kind}</dd></div>
				<div><dt>Bearing</dt><dd>{camera.bearing}°</dd></div>
				<div><dt>Lat / Lon</dt><dd>{camera.lat.toFixed(4)}, {camera.lon.toFixed(4)}</dd></div>
				<div><dt>Stamp</dt><dd>{stamp} ZRH</dd></div>
			</dl>
			<p class="note">{camera.note}</p>
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
					<p class="sub">{flight.onGround ? 'ON GROUND' : 'AIRBORNE'} · ADS-B</p>
				</div>
				<span class="badge">TRACK</span>
			</div>
			<dl>
				<div><dt>Position</dt><dd>{flight.lat.toFixed(4)}, {flight.lon.toFixed(4)}</dd></div>
				<div><dt>Stamp</dt><dd>{stamp} ZRH</dd></div>
			</dl>
			<p class="note">Live ADS-B contact over the Zürich area. Source: adsb.lol.</p>
		{/if}
	</aside>
{/if}

<style>
	.viewer {
		position: absolute;
		z-index: 26;
		right: 16px;
		top: calc(72px + env(safe-area-inset-top));
		width: min(360px, calc(100vw - 24px));
		display: grid;
		gap: 10px;
		padding: 12px;
		border-radius: 18px;
		background: color-mix(in srgb, #07141f 88%, transparent);
		border: 1px solid #3d5a7388;
		backdrop-filter: blur(14px);
		color: #e8f1fa;
		box-shadow: 0 18px 40px #03101866;
	}
	header {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		align-items: flex-start;
	}
	.eyebrow {
		font-size: 10px;
		letter-spacing: 0.16em;
		font-weight: 750;
		color: #8fd0ff;
	}
	h3 {
		font-size: 18px;
		font-weight: 800;
		letter-spacing: -0.03em;
	}
	header button {
		width: 40px;
		height: 40px;
		font-size: 24px;
		color: #9db4c8;
	}
	.frame {
		position: relative;
		overflow: hidden;
		border-radius: 12px;
		aspect-ratio: 16 / 10;
		background: #0a1520;
		border: 1px solid #2d4558;
	}
	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		filter: contrast(1.05) saturate(0.9);
	}
	.placeholder {
		height: 100%;
		display: grid;
		place-content: center;
		gap: 6px;
		padding: 16px;
		text-align: center;
		background:
			repeating-linear-gradient(
				0deg,
				transparent,
				transparent 2px,
				#ffffff08 2px,
				#ffffff08 3px
			),
			radial-gradient(circle at 50% 40%, #1a3348, #071018);
	}
	.placeholder strong {
		letter-spacing: 0.12em;
		font-size: 13px;
		color: #8fd0ff;
	}
	.placeholder p {
		font-size: 12px;
		color: #9db4c8;
		line-height: 1.45;
	}
	.sub {
		margin-top: 4px;
		font-size: 11px !important;
		letter-spacing: 0.08em;
		color: #3dd68c !important;
	}
	.badge {
		position: absolute;
		top: 8px;
		left: 8px;
		padding: 4px 8px;
		border-radius: 6px;
		background: #031018cc;
		border: 1px solid #8fd0ff55;
		font-size: 10px;
		font-weight: 750;
		letter-spacing: 0.1em;
		color: #8fd0ff;
	}
	.scan {
		pointer-events: none;
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, transparent 40%, #8fd0ff18 50%, transparent 60%);
		animation: scan 2.8s linear infinite;
	}
	@keyframes scan {
		from {
			transform: translateY(-100%);
		}
		to {
			transform: translateY(100%);
		}
	}
	dl {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
		font-size: 11px;
	}
	dt {
		color: #7f96aa;
		font-weight: 650;
	}
	dd {
		font-variant-numeric: tabular-nums;
		margin-top: 2px;
	}
	.note {
		font-size: 11px;
		color: #9db4c8;
		line-height: 1.45;
	}
	@media (max-width: 859px) {
		.viewer {
			left: 12px;
			right: 12px;
			width: auto;
			top: auto;
			bottom: calc(108px + env(safe-area-inset-bottom));
			max-height: min(42vh, 360px);
			overflow: auto;
		}
		.frame {
			aspect-ratio: 16 / 9;
			max-height: 140px;
		}
	}
</style>
