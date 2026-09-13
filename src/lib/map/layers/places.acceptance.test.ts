import { describe, expect, it } from 'vitest';
import {
	PLACES_CORE_LAYER_ID,
	PLACES_LABEL_LAYER_ID,
	PLACES_LABEL_MIN_ZOOM
} from '$lib/map/layers/placesLayer';
import { CATEGORY_SORT_KEY, placesToGeoJSON, type Place } from '$lib/places';

function sample(partial: Partial<Place> & Pick<Place, 'id' | 'name' | 'category'>): Place {
	return {
		lat: 47.37,
		lon: 8.54,
		subtitle: '',
		openHint: '',
		openingHours: null,
		isOpen: true,
		tags: [],
		...partial
	};
}

describe('places declutter contract', () => {
	it('keeps name labels off until settled city zoom (Google/HERE-like)', () => {
		expect(PLACES_LABEL_MIN_ZOOM).toBeGreaterThanOrEqual(14);
		expect(PLACES_CORE_LAYER_ID).toBe('places-core');
		expect(PLACES_LABEL_LAYER_ID).toBe('places-label');
	});

	it('emits sortKey so landmarks win collision over shops', () => {
		const geo = placesToGeoJSON([
			sample({ id: 'shop-1', name: 'Shop', category: 'shop' }),
			sample({ id: 'sight-1', name: 'Grossmünster', category: 'sights' })
		]);
		const shop = geo.features.find((f) => f.properties.id === 'shop-1');
		const sight = geo.features.find((f) => f.properties.id === 'sight-1');
		expect(sight?.properties.sortKey).toBe(CATEGORY_SORT_KEY.sights);
		expect(shop?.properties.sortKey).toBe(CATEGORY_SORT_KEY.shop);
		expect(sight!.properties.sortKey).toBeLessThan(shop!.properties.sortKey);
	});
});
