import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import { placesToGeoJSON, type Place } from '$lib/places';
import { CITY_MAX_ZOOM, CITY_MIN_ZOOM } from '$lib/map/swissSources';

export const PLACES_SOURCE_ID = 'places';
export const PLACES_CORE_LAYER_ID = 'places-core';
export const PLACES_LABEL_LAYER_ID = 'places-label';

/**
 * Names stay off at basin orbit — must sit above ORBIT_CAMERA.zoom (14.6).
 * Google/HERE keep salon/café labels for street settle, not city inspect.
 */
export const PLACES_LABEL_MIN_ZOOM = 15.5;

/**
 * Icons may overlap only after street settle — same floor as labels.
 * Orbit (14.6) must stay a clean aerial, not a sticker sheet.
 */
export const PLACES_ICON_OVERLAP_MIN_ZOOM = 15.5;

/**
 * Idempotent places overlay (category icon + name label).
 * Collision + zoom gates keep SWISSIMAGE readable; icons never ignore placement.
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

	if (map.getLayer(PLACES_CORE_LAYER_ID)) {
		const core = map.getLayer(PLACES_CORE_LAYER_ID);
		if (core && (core as { type?: string }).type === 'circle') {
			map.removeLayer(PLACES_CORE_LAYER_ID);
		}
	}

	if (!map.getLayer(PLACES_CORE_LAYER_ID)) {
		map.addLayer({
			id: PLACES_CORE_LAYER_ID,
			type: 'symbol',
			source: PLACES_SOURCE_ID,
			layout: {
				'icon-image': ['coalesce', ['get', 'icon'], 'place-sights'],
				'icon-size': [
					'interpolate',
					['linear'],
					['zoom'],
					CITY_MIN_ZOOM,
					0.42,
					13,
					0.55,
					15,
					0.72,
					CITY_MAX_ZOOM,
					0.95
				],
				// Generous padding + no overlap until street settle keeps orbit aerial clean.
				'icon-padding': [
					'interpolate',
					['linear'],
					['zoom'],
					CITY_MIN_ZOOM,
					22,
					14,
					8,
					16,
					2,
					CITY_MAX_ZOOM,
					1
				],
				'icon-allow-overlap': ['step', ['zoom'], false, PLACES_ICON_OVERLAP_MIN_ZOOM, true],
				'icon-ignore-placement': false,
				'icon-optional': true,
				'symbol-sort-key': ['get', 'sortKey'],
				'symbol-placement': 'point',
				'icon-pitch-alignment': 'viewport',
				'icon-rotation-alignment': 'viewport'
			},
			paint: {
				'icon-opacity': ['match', ['get', 'isOpen'], 'yes', 1, 'no', 0.45, 0.8]
			}
		});
	} else {
		map.setLayoutProperty(PLACES_CORE_LAYER_ID, 'icon-allow-overlap', [
			'step',
			['zoom'],
			false,
			PLACES_ICON_OVERLAP_MIN_ZOOM,
			true
		]);
		map.setLayoutProperty(PLACES_CORE_LAYER_ID, 'icon-padding', [
			'interpolate',
			['linear'],
			['zoom'],
			CITY_MIN_ZOOM,
			22,
			14,
			8,
			16,
			2,
			CITY_MAX_ZOOM,
			1
		]);
		map.setLayoutProperty(PLACES_CORE_LAYER_ID, 'icon-size', [
			'interpolate',
			['linear'],
			['zoom'],
			CITY_MIN_ZOOM,
			0.42,
			13,
			0.55,
			15,
			0.72,
			CITY_MAX_ZOOM,
			0.95
		]);
		map.setLayoutProperty(PLACES_CORE_LAYER_ID, 'icon-ignore-placement', false);
		map.setLayoutProperty(PLACES_CORE_LAYER_ID, 'icon-optional', true);
		map.setLayoutProperty(PLACES_CORE_LAYER_ID, 'symbol-sort-key', ['get', 'sortKey']);
	}

	if (!map.getLayer(PLACES_LABEL_LAYER_ID)) {
		map.addLayer({
			id: PLACES_LABEL_LAYER_ID,
			type: 'symbol',
			source: PLACES_SOURCE_ID,
			minzoom: PLACES_LABEL_MIN_ZOOM,
			layout: {
				'text-field': ['get', 'name'],
				'text-size': [
					'interpolate',
					['linear'],
					['zoom'],
					PLACES_LABEL_MIN_ZOOM,
					10,
					16,
					12,
					CITY_MAX_ZOOM,
					14
				],
				'text-offset': [0, 1.55],
				'text-font': ['Noto Sans Regular'],
				'text-max-width': 9,
				'text-padding': 4,
				'text-allow-overlap': false,
				'text-ignore-placement': false,
				'text-optional': true,
				'symbol-sort-key': ['get', 'sortKey'],
				'text-pitch-alignment': 'viewport',
				'text-rotation-alignment': 'viewport'
			},
			paint: {
				'text-color': '#16304e',
				'text-halo-color': '#ffffff',
				'text-halo-width': 1.4,
				'text-opacity': [
					'interpolate',
					['linear'],
					['zoom'],
					PLACES_LABEL_MIN_ZOOM,
					0,
					PLACES_LABEL_MIN_ZOOM + 0.4,
					1
				]
			}
		});
	} else {
		map.setLayerZoomRange(PLACES_LABEL_LAYER_ID, PLACES_LABEL_MIN_ZOOM, 24);
		map.setLayoutProperty(PLACES_LABEL_LAYER_ID, 'text-allow-overlap', false);
		map.setLayoutProperty(PLACES_LABEL_LAYER_ID, 'text-optional', true);
		map.setLayoutProperty(PLACES_LABEL_LAYER_ID, 'symbol-sort-key', ['get', 'sortKey']);
	}
}

export function syncPlacesLayer(map: MapLibreMap, places: Place[]) {
	ensurePlacesLayer(map, places);
}
