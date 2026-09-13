import { describe, expect, it } from 'vitest';
import {
	DEFAULT_INTEL_LAYERS,
	PARKING_LAYER,
	createDefaultIntelLayers
} from '$lib/city/layerRegistry';
import {
	PARKING_LABEL_LAYER_ID,
	PARKING_PILL_LAYER_ID,
	parkingsToGeoJSON
} from '$lib/map/layers/parkingLayer';
import type { Parking } from '$lib/parking';

describe('parking always-on contract', () => {
	it('defaults parking visible and keeps registry color blue', () => {
		expect(PARKING_LAYER.defaultVisible).toBe(true);
		expect(PARKING_LAYER.color.toLowerCase()).toBe('#1c7ed6');
	});

	it('emits GeoJSON lon/lat pills for coordinated garages only', () => {
		const items: Parking[] = [
			{
				id: 'a',
				name: 'Alpha',
				status: 'open',
				free: 12,
				capacity: 40,
				coordinates: [47.37, 8.54],
				address: '',
				link: '',
				directions: '',
				updated: null
			},
			{
				id: 'b',
				name: 'Beta',
				status: 'open',
				free: null,
				capacity: null,
				coordinates: null,
				address: '',
				link: '',
				directions: '',
				updated: null
			}
		];
		const geo = parkingsToGeoJSON(items);
		expect(geo.features).toHaveLength(1);
		expect(geo.features[0].geometry.coordinates).toEqual([8.54, 47.37]);
		expect(geo.features[0].properties.tone).toBe('green');
		expect(geo.features[0].properties.icon).toBe('parking-green');
		expect(geo.features[0].properties.label).toMatch(/Open/i);
		expect(geo.features[0].properties.label).not.toMatch(/Landmark/i);
	});

	it('defines pill + label layer ids used by the map host', () => {
		expect(PARKING_PILL_LAYER_ID).toBe('parking-pill');
		expect(PARKING_LABEL_LAYER_ID).toBe('parking-label');
	});
});

describe('intel defaults — no purple-dot first paint', () => {
	it('starts cameras and detection off; flights and traffic on', () => {
		expect(DEFAULT_INTEL_LAYERS.cameras).toBe(false);
		expect(DEFAULT_INTEL_LAYERS.detection).toBe(false);
		expect(DEFAULT_INTEL_LAYERS.flights).toBe(true);
		expect(DEFAULT_INTEL_LAYERS.traffic).toBe(true);
		expect(createDefaultIntelLayers()).toEqual(DEFAULT_INTEL_LAYERS);
	});
});
