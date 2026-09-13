import { describe, expect, it } from 'vitest';
import { trafficToGeoJSON, TRAFFIC_LEVEL_COLOR } from './swissTrafficLayer';
import type { TrafficSegment } from '$lib/intel/types';

describe('swissTrafficLayer', () => {
	it('maps free/slow/jam to high-contrast Swiss colors', () => {
		expect(TRAFFIC_LEVEL_COLOR.free).toBe('#1faa5b');
		expect(TRAFFIC_LEVEL_COLOR.slow).toBe('#e0a21b');
		expect(TRAFFIC_LEVEL_COLOR.jam).toBe('#e03131');
	});

	it('builds LineString features only for segments with coordinates', () => {
		const segments: TrafficSegment[] = [
			{
				id: 'astra-1',
				name: 'ZH Nord',
				coordinates: [
					[8.5, 47.4],
					[8.51, 47.41]
				],
				level: 'free',
				modeled: false
			},
			{
				id: 'astra-empty',
				name: 'skip',
				coordinates: [[8.5, 47.4]],
				level: 'jam',
				modeled: false
			}
		];
		const geo = trafficToGeoJSON(segments);
		expect(geo.features).toHaveLength(1);
		expect(geo.features[0].properties?.level).toBe('free');
		expect(geo.features[0].properties?.modeled).toBe(false);
	});
});
