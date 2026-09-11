<script lang="ts">
	import { onMount } from 'svelte';
	import type { Map } from 'leaflet';
	import 'leaflet/dist/leaflet.css';
	import { availability, type Parking } from './parking';
	export let position: [number, number];
	export let parkings: (Parking & { distance: number })[];
	let container: HTMLDivElement;
	let error = '';
	onMount(() => {
		let map: Map | undefined;
		let disposed = false;
		async function initialize() {
			try {
				const L = await import('leaflet');
				if (disposed) return;
				map = L.map(container).setView(position, 14);
				L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
					maxZoom: 19,
					attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
				})
					.on('tileerror', () => {
						error =
							'Map tiles could not load. Parking distances and navigation are available below.';
					})
					.addTo(map);
				L.circleMarker(position, {
					radius: 9,
					color: '#fff',
					weight: 3,
					fillColor: '#2563eb',
					fillOpacity: 1
				})
					.addTo(map)
					.bindTooltip('Your location');
				const bounds = L.latLngBounds([position]);
				for (const parking of parkings) {
					if (!parking.coordinates) continue;
					const label = availability(parking);
					const style = label === 'Full' ? 'full' : label.endsWith('free') ? 'free' : 'unknown';
					const popup = document.createElement('div');
					const name = document.createElement('strong');
					name.textContent = parking.name;
					const detail = document.createElement('p');
					detail.textContent = `${label} · ${parking.distance.toFixed(1)} km away`;
					const link = document.createElement('a');
					link.href = parking.directions;
					link.textContent = 'Navigate here';
					popup.append(name, detail, link);
					L.marker(parking.coordinates, {
						title: `${parking.name}: ${label}`,
						icon: L.divIcon({
							className: `parking-marker ${style}`,
							html: label,
							iconSize: [78, 32],
							iconAnchor: [39, 16]
						})
					})
						.addTo(map)
						.bindPopup(popup);
					bounds.extend(parking.coordinates);
				}
				map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });
			} catch {
				error = 'The map could not load. Use the nearby parking list below.';
			}
		}
		initialize();
		return () => {
			disposed = true;
			map?.remove();
		};
	});
</script>

{#if error}<p role="alert">{error}</p>{/if}
<div class="map" bind:this={container} aria-label="Map of nearby parking garages" />

<style>
	.map {
		height: 52vh;
		min-height: 320px;
		border-radius: 12px;
		z-index: 0;
	}
	:global(.parking-marker) {
		border: 2px solid white;
		border-radius: 16px;
		text-align: center;
		line-height: 28px;
		font: bold 13px/28px sans-serif;
		box-shadow: 0 2px 6px #0006;
		color: white;
	}
	:global(.parking-marker.full) {
		background: #b91c1c;
	}
	:global(.parking-marker.free) {
		background: #047857;
	}
	:global(.parking-marker.unknown) {
		background: #475569;
	}
</style>
