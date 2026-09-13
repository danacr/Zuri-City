import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type { TrafficSegment } from '$lib/intel/types';

export const SWISS_TRAFFIC_SOURCE_ID = 'swiss-traffic';
export const SWISS_TRAFFIC_CASE_LAYER_ID = 'swiss-traffic-case';
export const SWISS_TRAFFIC_FLOW_LAYER_ID = 'swiss-traffic-flow';

export const TRAFFIC_LEVEL_COLOR: Record<TrafficSegment['level'], string> = {
	free: '#1faa5b',
	slow: '#e0a21b',
	jam: '#e03131'
};

export function trafficToGeoJSON(segments: TrafficSegment[]) {
	return {
		type: 'FeatureCollection' as const,
		features: segments
			.filter((segment) => segment.coordinates.length >= 2)
			.map((segment) => ({
				type: 'Feature' as const,
				id: segment.id,
				properties: {
					id: segment.id,
					name: segment.name,
					level: segment.level,
					modeled: segment.modeled
				},
				geometry: {
					type: 'LineString' as const,
					coordinates: segment.coordinates
				}
			}))
	};
}

/**
 * Live roadworks / disruptions — thick amber/red corridors.
 * Kanton Zürich Baustellen + OSM construction (never a road-name hash).
 */
export function ensureSwissTrafficLayer(map: MapLibreMap, segments: TrafficSegment[], visible = true) {
	if (!map.getSource(SWISS_TRAFFIC_SOURCE_ID)) {
		map.addSource(SWISS_TRAFFIC_SOURCE_ID, {
			type: 'geojson',
			data: trafficToGeoJSON(segments)
		});
	} else {
		(map.getSource(SWISS_TRAFFIC_SOURCE_ID) as GeoJSONSource).setData(trafficToGeoJSON(segments));
	}

	const visibility = visible ? 'visible' : 'none';

	if (!map.getLayer(SWISS_TRAFFIC_CASE_LAYER_ID)) {
		map.addLayer({
			id: SWISS_TRAFFIC_CASE_LAYER_ID,
			type: 'line',
			source: SWISS_TRAFFIC_SOURCE_ID,
			layout: {
				visibility,
				'line-cap': 'round',
				'line-join': 'round'
			},
			paint: {
				'line-color': '#0b1724',
				'line-width': ['interpolate', ['linear'], ['zoom'], 12, 5, 15, 9, 17, 12],
				'line-opacity': 0.55
			}
		});
	} else {
		map.setLayoutProperty(SWISS_TRAFFIC_CASE_LAYER_ID, 'visibility', visibility);
	}

	if (!map.getLayer(SWISS_TRAFFIC_FLOW_LAYER_ID)) {
		map.addLayer({
			id: SWISS_TRAFFIC_FLOW_LAYER_ID,
			type: 'line',
			source: SWISS_TRAFFIC_SOURCE_ID,
			layout: {
				visibility,
				'line-cap': 'round',
				'line-join': 'round'
			},
			paint: {
				'line-color': [
					'match',
					['get', 'level'],
					'free',
					TRAFFIC_LEVEL_COLOR.free,
					'slow',
					TRAFFIC_LEVEL_COLOR.slow,
					TRAFFIC_LEVEL_COLOR.jam
				],
				'line-width': ['interpolate', ['linear'], ['zoom'], 12, 3.2, 15, 6.5, 17, 9],
				'line-opacity': 0.95
			}
		});
	} else {
		map.setLayoutProperty(SWISS_TRAFFIC_FLOW_LAYER_ID, 'visibility', visibility);
	}
}

export function syncSwissTrafficLayer(
	map: MapLibreMap,
	segments: TrafficSegment[],
	visible = true
) {
	ensureSwissTrafficLayer(map, segments, visible);
}
