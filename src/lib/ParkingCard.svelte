<script lang="ts">
	import { availability, parkingTone, parkingIssues, type Parking } from './parking';
	export let parking: Parking & { distance?: number };
	$: tone = parkingTone(parking);
	$: state = availability(parking);
	$: issues = parkingIssues(parking);
	$: percentage =
		parking.capacity && parking.free !== null
			? Math.min(100, (parking.free / parking.capacity) * 100)
			: null;
</script>

<article class="parking-card {tone}" aria-label={parking.name}>
	<div class="card-heading">
		<div>
			<h3>{parking.name.replace(/^Parkhaus\s+/, '')}</h3>
			<p class="address">
				{parking.address || 'Address unavailable'}{#if parking.distance !== undefined}<span>
						· {parking.distance < 1
							? `${Math.round(parking.distance * 1000)} m`
							: `${parking.distance.toFixed(1)} km`} away</span
					>{/if}
			</p>
		</div>
		<span class="status"><i></i>{state}</span>
	</div>
	<div class="spaces">
		<div><strong>{parking.free ?? '—'}</strong><span> / {parking.capacity ?? '—'}</span></div>
		<span class="space-label">{state === 'Closed' ? 'reported free · closed' : 'free spaces'}</span>
	</div>
	<div class="capacity-track" aria-hidden="true">
		<div style:width={`${percentage ?? 0}%`}></div>
	</div>
	{#if issues.length}<ul class="missing" aria-label="Garage issues">
			{#each issues as issue (issue)}<li>{issue}</li>{/each}
		</ul>{/if}
	<!-- eslint-disable svelte/no-navigation-without-resolve -- These are external provider and Google Maps URLs. -->
	<div class="card-actions">
		<a class="details" href={parking.link || 'https://www.pls-zh.ch/'}
			>Garage details <span aria-hidden="true">↗</span></a
		><a class="navigate" href={parking.directions} aria-label={`Directions to ${parking.name}`}
			>Directions <span aria-hidden="true">↗</span></a
		>
	</div>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
</article>

<style>
	.parking-card {
		--tone: var(--green);
		--tint: var(--green-soft);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 22px;
		padding: 20px;
		box-shadow: 0 3px 12px #13335504;
	}
	.red {
		--tone: var(--red);
		--tint: var(--red-soft);
	}
	.grey {
		--tone: var(--muted);
		--tint: var(--surface-muted);
	}
	.card-heading {
		display: flex;
		gap: 12px;
		align-items: flex-start;
		justify-content: space-between;
	}
	h3 {
		font-size: 19px;
		font-weight: 750;
		letter-spacing: -0.5px;
		line-height: 1.25;
	}
	.address {
		font-size: 12px;
		color: var(--muted);
		margin-top: 7px;
		line-height: 1.6;
	}
	.address span {
		white-space: nowrap;
	}
	.status {
		display: flex;
		align-items: center;
		gap: 5px;
		flex-shrink: 0;
		background: var(--tint);
		color: var(--tone);
		padding: 6px 8px;
		border-radius: 7px;
		font-weight: 700;
		font-size: 11px;
	}
	i {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: currentColor;
	}
	.spaces {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px;
		margin: 20px 0 10px;
		font-variant-numeric: tabular-nums;
	}
	.spaces strong {
		font-size: 38px;
		font-weight: 750;
		letter-spacing: -1.8px;
		line-height: 1;
		color: var(--tone);
	}
	.spaces div > span {
		font-size: 20px;
		color: var(--muted);
		letter-spacing: -0.5px;
	}
	.space-label {
		font-size: 11px;
		color: var(--muted);
		text-align: right;
	}
	.capacity-track {
		background: var(--surface-muted);
		height: 4px;
		border-radius: 4px;
		overflow: hidden;
	}
	.capacity-track div {
		height: 100%;
		border-radius: 4px;
		background: var(--tone);
	}
	.missing li + li {
		margin-top: 4px;
	}
	.missing {
		margin: 10px 0 0;
		color: var(--muted);
		font-size: 12px;
		line-height: 1.5;
	}
	.card-actions {
		margin-top: 14px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	.card-actions a {
		min-height: 44px;
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		font-weight: 650;
		text-decoration: none;
	}
	.details {
		color: var(--muted);
	}
	.navigate {
		padding: 0 14px;
		background: var(--accent-soft);
		color: var(--accent);
		border-radius: 10px;
	}
	.navigate:hover {
		background: var(--accent-hover);
	}
</style>
