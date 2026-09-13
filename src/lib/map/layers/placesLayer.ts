import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import { categoryColorExpression, placesToGeoJSON, type Place } from '$lib/places';
import { CITY_MAX_ZOOM, CITY_MIN_ZOOM } from '$lib/map/swissSources';

export const PLACES_SOURCE_ID = 'places';

/**
 * Idempotent places overlay (glow + category icon + name label).
 * Icon images must already be registered by the host map.
 */
export function ensurePlacesLayer(map: MapLibreMap, places: Place[]) {
	if (!map.getSource(PLACES_SOURCE_ID)) {
		map.addSource(PLACES_SOURCE_ID, {
			type: 'geojson',
			data: placesToGeoJSON(places),
			maxzoom: 18
		});
	} else {
		(map.getSource(PLACES_SOURCE_ID) as GeoJSONSource).setData(placesToGeoJSON(places));
	}

	if (map.getLayer('places-core')) {
		const core = map.getLayer('places-core');
		if (core && (core as { type?: string }).type === 'circle') {
			map.removeLayer('places-core');
		}
	}

	if (!map.getLayer('places-glow')) {
		map.addLayer({
			id: 'places-glow',
			type: 'circle',
			source: PLACES_SOURCE_ID,
			paint: {
				'circle-radius': 16,
				'circle-color': categoryColorExpression() as never,
				'circle-opacity': 0.18,
				'circle-blur': 0.7
			}
		});
	}

	if (!map.getLayer('places-core')) {
		map.addLayer({
			id: 'places-core',
			type: 'symbol',
			source: PLACES_SOURCE_ID,
			layout: {
				'icon-image': ['coalesce', ['get', 'icon'], 'place-sights'],
				'icon-size': [
					'interpolate',
					['linear'],
					['zoom'],
					CITY_MIN_ZOOM,
					0.55,
					15,
					0.72,
					CITY_MAX_ZOOM,
					0.95
				],
				'icon-allow-overlap': true,
				'icon-ignore-placement': true,
				'symbol-placement': 'point',
				'icon-pitch-alignment': 'viewport',
				'icon-rotation-alignment': 'viewport'
			},
			paint: {
				'icon-opacity': ['match', ['get', 'isOpen'], 'yes', 1, 'no', 0.45, 0.8]
			}
		});
	}

	if (!map.getLayer('places-label')) {
		map.addLayer({
			id: 'places-label',
			type: 'symbol',
			source: PLACES_SOURCE_ID,
			layout: {
				'text-field': ['get', 'name'],
				'text-size': 11,
				'text-offset': [0, 1.7],
				'text-font': ['Noto Sans Regular'],
				'text-max-width': 10
			},
			paint: {
				'text-color': '#16304e',
				'text-halo-color': '#ffffff',
				'text-halo-width': 1.4
			}
		});
	}
}

export function syncPlacesLayer(map: MapLibreMap, places: Place[]) {
	ensurePlacesLayer(map, places);
}
