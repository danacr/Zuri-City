<script lang="ts">
	import { onMount } from 'svelte';
	import type { Map } from 'leaflet';
	import 'leaflet/dist/leaflet.css';
	import { availability, parkingTone, spotCount, parkingIssues, type Parking } from './parking';
	export let position: [number, number];
	export let parkings: (Parking & { distance: number })[];
	const zurichCenter: [number, number] = [47.3769, 8.5417];
	const nearbyRadiusKm = 20;
	let container: HTMLDivElement;
	let error = '';
	onMount(() => {
		let map: Map | undefined;
		let disposed = false;
		async function initialize() {
			try {
				const L = await import('leaflet');
				if (disposed) return;
				const nearby = parkings.some(
					(parking) => parking.coordinates && parking.distance <= nearbyRadiusKm
				);
				map = L.map(container).setView(nearby ? position : zurichCenter, 14);
				L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
					maxZoom: 19,
					attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
				})
					.on('tileerror', () => {
						error =
							'Map tiles could not load. Switch to List view for parking details and navigation.';
					})
					.addTo(map);
				L.circleMarker(position, {
					radius: 9,
					className: 'user-location',
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
					const style = parkingTone(parking);
					const count = spotCount(parking);
					const markerWidth = Math.max(72, Math.ceil(count.length * 9.4 + 12));
					const popup = document.createElement('div');
					const name = document.createElement('strong');
					name.textContent = parking.name;
					const detail = document.createElement('p');
					detail.textContent = `${count} free spaces · ${label} · ${parking.distance.toFixed(
						1
					)} km away`;
					const link = document.createElement('a');
					link.href = parking.directions;
					link.textContent = 'Navigate here';
					popup.append(name, detail);
					const issues = parkingIssues(parking);
					if (issues.length) {
						const note = document.createElement('p');
						note.textContent = issues.join(' ');
						popup.append(note);
					}
					popup.append(link);
					L.marker(parking.coordinates, {
						title: `${parking.name}: ${count} free spaces, ${label}`,
						icon: L.divIcon({
							className: `parking-marker ${style}`,
							html: `<strong>${count}</strong><span>${label}</span>`,
							iconSize: [markerWidth, 40],
							iconAnchor: [markerWidth / 2, 20]
						})
					})
						.addTo(map)
						.bindPopup(popup);
					if (parkings.indexOf(parking) < 5) bounds.extend(parking.coordinates);
				}
				if (nearby) map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
			} catch {
				error = 'The map could not load. Switch to List view for parking details.';
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
<div class="map" bind:this={container} aria-label="Map of nearby parking garages"></div>

<style>
	.map {
		height: calc(100vh - 88px);
		height: calc(100svh - 88px);
		min-height: 320px;
		max-height: 900px;
		border-radius: 20px;
		z-index: 0;
		border: 1px solid var(--border);
	}
	:global(.parking-marker) {
		border: 2px solid var(--tone);
		border-radius: 10px;
		text-align: center;
		box-shadow: 0 3px 12px #18345340;
		color: var(--tone);
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		padding: 2px 4px;
	}
	:global(.parking-marker strong) {
		display: block;
		font-size: 17px;
		font-weight: 800;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
		line-height: 20px;
	}
	:global(.parking-marker span) {
		display: block;
		font-size: 10px;
		line-height: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.6px;
	}
	:global(.parking-marker.red) {
		--tone: var(--red);
		background: var(--red-soft);
	}
	:global(.parking-marker.green) {
		--tone: var(--green);
		background: var(--green-soft);
	}
	:global(.parking-marker.grey) {
		--tone: var(--muted);
		background: var(--surface-muted);
	}
	:global(.leaflet-popup-content a) {
		display: inline-flex;
		min-height: 44px;
		align-items: center;
	}
	:global(.leaflet-control-zoom a) {
		min-width: 40px;
		min-height: 40px;
		line-height: 40px;
	}
</style>
