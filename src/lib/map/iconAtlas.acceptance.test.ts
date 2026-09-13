import { describe, expect, it } from 'vitest';
import {
	GENERIC_FAMILY_ICON_IDS,
	aircraftIconId,
	paintFromFlight
} from '$lib/intel/aircraftIcons';
import { PLACE_ICON_IDS } from '$lib/city/placeIcons';
import { PLACE_CATEGORIES } from '$lib/places';

describe('sprite icon contracts (not dots)', () => {
	it('registers a place sprite id for every category', () => {
		for (const category of PLACE_CATEGORIES) {
			expect(PLACE_ICON_IDS[category]).toMatch(/^place-/);
		}
	});

	it('registers generic aircraft planform sprites for every family', () => {
		const ids = Object.values(GENERIC_FAMILY_ICON_IDS);
		expect(ids.length).toBeGreaterThanOrEqual(5);
		for (const id of ids) {
			expect(id).toMatch(/^plane-/);
		}
	});

	it('builds Swiss A320 icon ids as plane sprites, not circle fallbacks', () => {
		const paint = paintFromFlight({ callsign: 'SWR123', typeCode: 'A320' });
		const id = aircraftIconId(paint);
		expect(id.startsWith('plane-')).toBe(true);
		expect(id).not.toMatch(/dot|circle|halo/i);
	});
});
