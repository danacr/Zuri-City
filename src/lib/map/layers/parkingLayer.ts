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
			.map((parking) => {
				const tone = parkingTone(parking);
				const iconTone = tone === 'green' || tone === 'red' ? tone : 'blue';
				return {
					type: 'Feature' as const,
					id: parking.id || parking.name,
					properties: {
						id: parking.id || parking.name,
						name: parking.name,
						label: parkingMapLabel(parking),
						tone,
						icon: `parking-${iconTone}`
					},
					geometry: {
						type: 'Point' as const,
						// Stored as [lat, lon]; GeoJSON needs [lon, lat].
						coordinates: [parking.coordinates![1], parking.coordinates![0]]
					}
				};
			})
	};
}

/**
 * Live PLS parking POIs: tone-colored "P" sprites + capacity labels.
 * Defaults on; Layers can hide/show markers.
 */
export function ensureParkingLayer(map: MapLibreMap, visible = true) {
	if (!map.getSource(PARKING_SOURCE_ID)) {
		map.addSource(PARKING_SOURCE_ID, {
			type: 'geojson',
			data: { type: 'FeatureCollection', features: [] }
		});
	}

	// Migrate legacy circle pills → symbol POI sprites.
	if (map.getLayer(PARKING_PILL_LAYER_ID)) {
		const layer = map.getLayer(PARKING_PILL_LAYER_ID) as { type?: string } | undefined;
		if (layer?.type === 'circle') {
			map.removeLayer(PARKING_PILL_LAYER_ID);
		}
	}

	if (!map.getLayer(PARKING_PILL_LAYER_ID)) {
		map.addLayer({
			id: PARKING_PILL_LAYER_ID,
			type: 'symbol',
			source: PARKING_SOURCE_ID,
			layout: {
				visibility: visible ? 'visible' : 'none',
				'icon-image': ['coalesce', ['get', 'icon'], 'parking-blue'],
				'icon-size': [
					'interpolate',
					['linear'],
					['zoom'],
					12,
					0.55,
					15,
					0.72,
					17,
					0.9
				],
				'icon-allow-overlap': true,
				'icon-ignore-placement': false,
				'icon-anchor': 'center',
				'icon-padding': 2,
				'symbol-sort-key': [
					'match',
					['get', 'tone'],
					'green',
					0,
					'red',
					1,
					2
				]
			},
			paint: {
				'icon-opacity': 0.98
			}
		});
	} else {
		map.setLayoutProperty(PARKING_PILL_LAYER_ID, 'visibility', visible ? 'visible' : 'none');
	}

	if (!map.getLayer(PARKING_LABEL_LAYER_ID)) {
		map.addLayer({
			id: PARKING_LABEL_LAYER_ID,
			type: 'symbol',
			source: PARKING_SOURCE_ID,
			minzoom: 13,
			layout: {
				visibility: visible ? 'visible' : 'none',
				'text-field': ['get', 'label'],
				'text-size': ['interpolate', ['linear'], ['zoom'], 13, 10, 15, 12, 17, 14],
				'text-font': ['Noto Sans Bold'],
				'text-offset': [0, 1.45],
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
		map.setLayoutProperty(PARKING_LABEL_LAYER_ID, 'visibility', visible ? 'visible' : 'none');
	}
}

export function syncParkingLayer(map: MapLibreMap, parkings: Parking[], visible = true) {
	ensureParkingLayer(map, visible);
	const source = map.getSource(PARKING_SOURCE_ID) as GeoJSONSource | undefined;
	source?.setData(parkingsToGeoJSON(parkings));
	for (const id of [PARKING_PILL_LAYER_ID, PARKING_LABEL_LAYER_ID]) {
		if (map.getLayer(id)) {
			map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
		}
	}
}
