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
	/** When true, show a Done control (mobile sheet). */
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
</script>

<div class="layers-panel" role="region" aria-label="Map layers">
	<div class="panel-head">
		<p class="section-title head">Layers</p>
		{#if dismissible}
			<button type="button" class="done" aria-label="Close layers" on:click={() => onDismiss?.()}
				>Done</button
			>
		{/if}
	</div>

	<div class="bulk-row" role="group" aria-label="Place category bulk toggles">
		<button type="button" class="bulk" on:click={onShowAllPlaces}>Show all</button>
		<button type="button" class="bulk" on:click={onHideAllPlaces}>Hide all</button>
	</div>

	<p class="section-title">Places</p>
	<ul class="layer-list">
		{#each PLACE_CATEGORIES as key (key)}
			<li>
				<button
					type="button"
					class="layer"
					class:on={placeLayers[key]}
					aria-pressed={placeLayers[key]}
					on:click={() => onTogglePlace(key)}
				>
					{#if categoryIcons[key]}
						<img class="cat-icon" src={categoryIcons[key]} alt="" width="18" height="18" />
					{:else}
						<i style:background={CATEGORY_COLOR[key]}></i>
					{/if}
					<span class="label">{CATEGORY_LABEL[key]}</span>
					<strong>{counts[key]}</strong>
				</button>
			</li>
		{/each}
		<li>
			<button
				type="button"
				class="layer"
				class:on={openNowOnly}
				aria-pressed={openNowOnly}
				on:click={onToggleOpenNow}
			>
				<i style:background="#12b886"></i>
				<span class="label">Open now</span>
				<strong>{counts.openNow}</strong>
			</button>
		</li>
		<li>
			<button
				type="button"
				class="layer"
				class:on={showParking}
				aria-pressed={showParking}
				on:click={onToggleParking}
			>
				<i class="parking" style:background={PARKING_LAYER.color}></i>
				<span class="label">{PARKING_LAYER.label}</span>
				<strong>{counts.parking}</strong>
			</button>
		</li>
	</ul>

	<p class="section-title">Live feeds</p>
	<ul class="layer-list">
		{#each INTEL_LAYER_IDS as key (key)}
			<li>
				<button
					type="button"
					class="layer"
					class:on={intelLayers[key]}
					aria-pressed={intelLayers[key]}
					on:click={() => onToggleIntel(key)}
				>
					<i style:background={INTEL_LAYER_COLOR[key]}></i>
					<span class="label">{INTEL_LAYER_LABEL[key]}</span>
					<strong>{key === 'detection' ? '' : counts[key]}</strong>
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

	{#if onFindAircraft}
		<button type="button" class="find-aircraft" on:click={onFindAircraft}>
			Find aircraft · {flightCount}
		</button>
	{/if}

	<slot />
</div>

<style>
	.layers-panel {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-height: 0;
	}
	.panel-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}
	.section-title {
		font-size: 10px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		font-weight: 750;
		color: var(--muted);
		margin: 8px 0 2px;
	}
	.section-title.head {
		margin: 0;
		font-size: 11px;
		color: var(--text);
	}
	.done {
		min-height: 32px;
		padding: 0 10px;
		border-radius: 999px;
		background: var(--accent-soft);
		color: var(--accent);
		font-size: 12px;
		font-weight: 750;
		border: none;
	}
	.bulk-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 6px;
		margin: 4px 0 2px;
	}
	.bulk {
		min-height: 34px;
		border-radius: 10px;
		background: var(--surface-muted);
		color: var(--text);
		font-size: 12px;
		font-weight: 750;
		border: 1px solid var(--border);
	}
	.layer-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	.layer {
		display: grid;
		grid-template-columns: 18px 1fr auto;
		align-items: center;
		gap: 8px;
		width: 100%;
		min-height: 36px;
		padding: 0 10px;
		border-radius: 11px;
		background: var(--surface-muted);
		color: var(--text);
		font-weight: 700;
		font-size: 12px;
		text-align: left;
		opacity: 0.55;
		border: none;
	}
	.layer.on {
		opacity: 1;
		background: var(--accent-soft);
		color: var(--accent);
	}
	.layer .label {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.layer strong {
		font-variant-numeric: tabular-nums;
		font-weight: 750;
		opacity: 0.85;
	}
	.cat-icon {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		display: block;
		object-fit: cover;
	}
	.layer i {
		width: 8px;
		height: 8px;
		margin: 0 auto;
		border-radius: 50%;
	}
	.layer i.parking {
		border-radius: 3px;
		width: 10px;
		height: 10px;
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
	.find-aircraft {
		display: block;
		width: 100%;
		min-height: 40px;
		margin: 8px 0 2px;
		border-radius: 12px;
		background: #f0b429;
		color: #1a1303;
		font-weight: 800;
		font-size: 12px;
		border: none;
	}
</style>
