<script lang="ts">
	import {
		CATEGORY_COLOR,
		CATEGORY_LABEL,
		INTEL_LAYER_COLOR,
		INTEL_LAYER_IDS,
		INTEL_LAYER_LABEL,
		PARKING_LAYER,
		PLACE_CATEGORIES,
		type LayerCounts
	} from './layerRegistry';
	import { TRAFFIC_LEGEND, type IntelLayer } from '$lib/intel/types';
	import type { PlaceCategory } from './places';

	export let placeLayers: Record<PlaceCategory, boolean>;
	export let intelLayers: Record<IntelLayer, boolean>;
	export let showParking: boolean;
	export let openNowOnly: boolean;
	export let counts: LayerCounts;
	export let categoryIcons: Partial<Record<PlaceCategory, string>> = {};
	/** Mobile sheet: show close control. */
	export let dismissible = false;
	export let onDismiss: (() => void) | undefined = undefined;
	export let onTogglePlace: (key: PlaceCategory) => void;
	export let onToggleIntel: (key: IntelLayer) => void;
	export let onToggleParking: () => void;
	export let onToggleOpenNow: () => void;
	export let onShowAllPlaces: () => void;
	export let onHideAllPlaces: () => void;
	export let onFindAircraft: (() => void) | undefined = undefined;
	export let flightCount = 0;

	$: placesOn = PLACE_CATEGORIES.filter((key) => placeLayers[key]).length;
	$: feedsOn = INTEL_LAYER_IDS.filter((key) => intelLayers[key]).length;
</script>

<div class="hud" role="region" aria-label="Map layers">
	<header class="hud-head">
		<div>
			<p class="eyebrow">Map layers</p>
			<h2>What you see</h2>
			<p class="status">{placesOn}/{PLACE_CATEGORIES.length} places · {feedsOn} feeds</p>
		</div>
		{#if dismissible}
			<button type="button" class="close" aria-label="Close layers" on:click={() => onDismiss?.()}
				>Close</button
			>
		{/if}
	</header>

	<section class="master" aria-label="Places master toggle">
		<button type="button" class="master-btn" on:click={onShowAllPlaces}>
			<span class="master-label">All places</span>
			<span class="master-hint">Show every POI</span>
		</button>
		<button type="button" class="master-btn ghost" on:click={onHideAllPlaces}>
			<span class="master-label">None</span>
			<span class="master-hint">Clear the map</span>
		</button>
	</section>

	<section class="block" aria-labelledby="places-heading">
		<div class="block-head">
			<h3 id="places-heading">Places</h3>
		</div>
		<div class="place-grid" role="group" aria-label="Place categories">
			{#each PLACE_CATEGORIES as key (key)}
				<button
					type="button"
					class="tile"
					class:on={placeLayers[key]}
					aria-pressed={placeLayers[key]}
					on:click={() => onTogglePlace(key)}
				>
					{#if categoryIcons[key]}
						<img class="glyph" src={categoryIcons[key]} alt="" width="20" height="20" />
					{:else}
						<span class="dot" style:background={CATEGORY_COLOR[key]}></span>
					{/if}
					<span class="tile-label">{CATEGORY_LABEL[key]}</span>
					<span class="tile-count">{counts[key]}</span>
				</button>
			{/each}
		</div>
	</section>

	<section class="block" aria-labelledby="filters-heading">
		<div class="block-head">
			<h3 id="filters-heading">Filters</h3>
		</div>
		<ul class="switch-list">
			<li>
				<button
					type="button"
					class="switch"
					class:on={openNowOnly}
					aria-pressed={openNowOnly}
					on:click={onToggleOpenNow}
				>
					<span class="switch-copy">
						<span class="switch-label">Open now</span>
						<span class="switch-meta">{counts.openNow} places</span>
					</span>
					<span class="knob" aria-hidden="true"></span>
				</button>
			</li>
			<li>
				<button
					type="button"
					class="switch"
					class:on={showParking}
					aria-pressed={showParking}
					on:click={onToggleParking}
				>
					<span class="switch-copy">
						<span class="switch-label">{PARKING_LAYER.label}</span>
						<span class="switch-meta">{counts.parking} · free / capacity on map</span>
					</span>
					<span class="knob" aria-hidden="true"></span>
				</button>
			</li>
		</ul>
	</section>

	<section class="block" aria-labelledby="feeds-heading">
		<div class="block-head">
			<h3 id="feeds-heading">Live feeds</h3>
		</div>
		<ul class="switch-list">
			{#each INTEL_LAYER_IDS as key (key)}
				<li>
					<button
						type="button"
						class="switch"
						class:on={intelLayers[key]}
						aria-pressed={intelLayers[key]}
						on:click={() => onToggleIntel(key)}
					>
						<span class="feed-dot" style:background={INTEL_LAYER_COLOR[key]}></span>
						<span class="switch-copy">
							<span class="switch-label">{INTEL_LAYER_LABEL[key]}</span>
							{#if key !== 'detection'}
								<span class="switch-meta">{counts[key]}</span>
							{/if}
						</span>
						<span class="knob" aria-hidden="true"></span>
					</button>
				</li>
			{/each}
		</ul>
		{#if intelLayers.traffic}
			<div class="traffic-legend" aria-label="Traffic colors">
				{#each TRAFFIC_LEGEND as item (item.label)}
					<span><i style:background={item.color}></i>{item.label}</span>
				{/each}
			</div>
		{/if}
	</section>

	{#if onFindAircraft}
		<button type="button" class="aircraft" on:click={onFindAircraft}>
			Find aircraft
			<strong>{flightCount}</strong>
		</button>
	{/if}

	<slot />
</div>

<style>
	.hud {
		display: flex;
		flex-direction: column;
		gap: 14px;
		min-height: 0;
		color: var(--text);
	}
	.hud-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
	}
	.eyebrow {
		margin: 0;
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-weight: 750;
		color: var(--muted);
	}
	h2 {
		margin: 2px 0 0;
		font-size: 1.35rem;
		font-weight: 800;
		letter-spacing: -0.03em;
		line-height: 1.15;
	}
	.status {
		margin: 4px 0 0;
		font-size: 12px;
		font-weight: 650;
		color: var(--muted);
	}
	.close {
		flex: 0 0 auto;
		min-height: 36px;
		padding: 0 12px;
		border: 1px solid var(--border);
		border-radius: 10px;
		background: var(--surface-muted);
		color: var(--text);
		font-size: 12px;
		font-weight: 750;
	}

	.master {
		display: grid;
		grid-template-columns: 1.35fr 1fr;
		gap: 8px;
	}
	.master-btn {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 2px;
		min-height: 58px;
		padding: 10px 12px;
		border: none;
		border-radius: 12px;
		background: var(--accent-button, #1465c8);
		color: #f7fbff;
		text-align: left;
	}
	.master-btn.ghost {
		background: var(--surface-muted, #223147);
		color: var(--text);
		border: 1px solid var(--border);
	}
	.master-label {
		font-size: 14px;
		font-weight: 800;
		letter-spacing: -0.02em;
	}
	.master-hint {
		font-size: 11px;
		font-weight: 600;
		opacity: 0.78;
	}

	.block {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.block-head h3 {
		margin: 0;
		font-size: 11px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-weight: 750;
		color: var(--muted);
	}

	.place-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 6px;
	}
	.tile {
		display: grid;
		grid-template-columns: 20px 1fr auto;
		align-items: center;
		gap: 7px;
		min-height: 44px;
		padding: 8px 10px;
		border: 1px solid transparent;
		border-radius: 12px;
		background: color-mix(in srgb, var(--surface-muted, #223147) 88%, transparent);
		color: var(--muted);
		text-align: left;
		opacity: 0.72;
	}
	.tile.on {
		opacity: 1;
		color: var(--text);
		background: var(--accent-soft, #1d3553);
		border-color: color-mix(in srgb, var(--accent, #87baff) 28%, transparent);
	}
	.glyph {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		object-fit: cover;
	}
	.dot {
		width: 10px;
		height: 10px;
		margin: 0 auto;
		border-radius: 50%;
	}
	.tile-label {
		min-width: 0;
		font-size: 12px;
		font-weight: 750;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.tile-count {
		font-size: 11px;
		font-weight: 750;
		font-variant-numeric: tabular-nums;
		opacity: 0.8;
	}

	.switch-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.switch {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 10px;
		width: 100%;
		min-height: 48px;
		padding: 8px 12px;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: color-mix(in srgb, var(--surface-muted, #223147) 80%, transparent);
		color: var(--text);
		text-align: left;
	}
	.switch:not(.on) {
		opacity: 0.7;
	}
	.switch.on {
		background: var(--accent-soft, #1d3553);
		border-color: color-mix(in srgb, var(--accent, #87baff) 30%, transparent);
	}
	.feed-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}
	.switch-copy {
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
	}
	.switch-label {
		font-size: 13px;
		font-weight: 750;
	}
	.switch-meta {
		font-size: 11px;
		font-weight: 600;
		color: var(--muted);
	}
	.knob {
		width: 34px;
		height: 20px;
		border-radius: 999px;
		background: #2a3a4f;
		position: relative;
		flex: 0 0 auto;
		transition: background 0.15s ease;
	}
	.knob::after {
		content: '';
		position: absolute;
		top: 2px;
		left: 2px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #d7e4f2;
		transition: transform 0.15s ease;
	}
	.switch.on .knob {
		background: var(--accent-button, #1465c8);
	}
	.switch.on .knob::after {
		transform: translateX(14px);
		background: #fff;
	}

	.traffic-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 14px;
		padding: 8px 10px;
		border-radius: 10px;
		background: color-mix(in srgb, var(--surface-muted, #223147) 70%, transparent);
		font-size: 11px;
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
		border-radius: 50%;
	}

	.aircraft {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		width: 100%;
		min-height: 46px;
		padding: 0 14px;
		border: none;
		border-radius: 12px;
		background: #c89614;
		color: #1a1404;
		font-size: 13px;
		font-weight: 800;
	}
	.aircraft strong {
		font-variant-numeric: tabular-nums;
	}
</style>
