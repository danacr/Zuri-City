import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import { parkingMapLabel, parkingTone, type Parking } from '$lib/parking';

export const PARKING_SOURCE_ID = 'parking';
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

/** Idempotent parking overlay — labels only (no list/card UI). */
export function ensureParkingLayer(map: MapLibreMap, visible: boolean) {
	if (!map.getSource(PARKING_SOURCE_ID)) {
		map.addSource(PARKING_SOURCE_ID, {
			type: 'geojson',
			data: { type: 'FeatureCollection', features: [] }
		});
	}

	if (map.getLayer('parking-pill')) {
		map.removeLayer('parking-pill');
	}

	if (!map.getLayer(PARKING_LABEL_LAYER_ID)) {
		map.addLayer({
			id: PARKING_LABEL_LAYER_ID,
			type: 'symbol',
			source: PARKING_SOURCE_ID,
			layout: {
				visibility: visible ? 'visible' : 'none',
				'text-field': ['get', 'label'],
				'text-size': ['interpolate', ['linear'], ['zoom'], 12, 11, 15, 13, 17, 15],
				'text-font': ['Noto Sans Bold'],
				'text-anchor': 'center',
				'text-allow-overlap': true,
				'text-ignore-placement': true,
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
				'text-halo-width': 2.4,
				'text-halo-blur': 0.2
			}
		});
	} else {
		map.setLayoutProperty(PARKING_LABEL_LAYER_ID, 'visibility', visible ? 'visible' : 'none');
	}
}

export function syncParkingLayer(map: MapLibreMap, parkings: Parking[], visible: boolean) {
	ensureParkingLayer(map, visible);
	const source = map.getSource(PARKING_SOURCE_ID) as GeoJSONSource | undefined;
	source?.setData(parkingsToGeoJSON(visible ? parkings : []));
}
