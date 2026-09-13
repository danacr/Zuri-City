import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import { parkingMapLabel, parkingTone, type Parking } from '$lib/parking';

export const PARKING_SOURCE_ID = 'parking';
export const PARKING_PILL_LAYER_ID = 'parking-pill';
export const PARKING_LABEL_LAYER_ID = 'parking-label';

export function parkingsToGeoJSON(items: Parking[]) {
	return {
		type: 'FeatureCollection' as const,
		features: items
			.filter((parking) => parking.coordinates !== null)
			.map((parking) => ({
				type: 'Feature' as const,
				id: parking.id || parking.name,
				properties: {
					id: parking.id || parking.name,
					name: parking.name,
					label: parkingMapLabel(parking),
					tone: parkingTone(parking)
				},
				geometry: {
					type: 'Point' as const,
					// Stored as [lat, lon]; GeoJSON needs [lon, lat].
					coordinates: [parking.coordinates![1], parking.coordinates![0]]
				}
			}))
	};
}

/**
 * Always-on parking overlay: blue/green/red capacity pills + labels.
 * Product contract: parking is never a map-layer toggle — always visible.
 */
export function ensureParkingLayer(map: MapLibreMap, _visible = true) {
	if (!map.getSource(PARKING_SOURCE_ID)) {
		map.addSource(PARKING_SOURCE_ID, {
			type: 'geojson',
			data: { type: 'FeatureCollection', features: [] }
		});
	}

	if (!map.getLayer(PARKING_PILL_LAYER_ID)) {
		map.addLayer({
			id: PARKING_PILL_LAYER_ID,
			type: 'circle',
			source: PARKING_SOURCE_ID,
			paint: {
				'circle-radius': [
					'interpolate',
					['linear'],
					['zoom'],
					12,
					6,
					15,
					8,
					17,
					10
				],
				'circle-color': [
					'match',
					['get', 'tone'],
					'green',
					'#2f9e44',
					'red',
					'#e03131',
					'#1c7ed6'
				],
				'circle-stroke-width': 2,
				'circle-stroke-color': '#ffffff',
				'circle-opacity': 0.95
			}
		});
	}

	if (!map.getLayer(PARKING_LABEL_LAYER_ID)) {
		map.addLayer({
			id: PARKING_LABEL_LAYER_ID,
			type: 'symbol',
			source: PARKING_SOURCE_ID,
			minzoom: 13,
			layout: {
				visibility: 'visible',
				'text-field': ['get', 'label'],
				'text-size': ['interpolate', ['linear'], ['zoom'], 13, 10, 15, 12, 17, 14],
				'text-font': ['Noto Sans Bold'],
				'text-offset': [0, 1.35],
				'text-anchor': 'top',
				'text-allow-overlap': false,
				'text-optional': true,
				'text-padding': 2
			},
			paint: {
				'text-color': [
					'match',
					['get', 'tone'],
					'green',
					'#1b6b2e',
					'red',
					'#a61e1e',
					'#1c4d7a'
				],
				'text-halo-color': '#ffffff',
				'text-halo-width': 2.2,
				'text-halo-blur': 0.2
			}
		});
	} else {
		map.setLayoutProperty(PARKING_LABEL_LAYER_ID, 'visibility', 'visible');
	}

	if (map.getLayer(PARKING_PILL_LAYER_ID)) {
		map.setLayoutProperty(PARKING_PILL_LAYER_ID, 'visibility', 'visible');
	}
}

/** Parking is always on — `visible` is ignored so callers cannot blank the layer. */
export function syncParkingLayer(map: MapLibreMap, parkings: Parking[], _visible = true) {
	ensureParkingLayer(map, true);
	const source = map.getSource(PARKING_SOURCE_ID) as GeoJSONSource | undefined;
	source?.setData(parkingsToGeoJSON(parkings));
}
