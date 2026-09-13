import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSwissTraffic, resetSwissTrafficCacheForTests } from './swissTraffic';

describe('loadSwissTraffic', () => {
	beforeEach(() => {
		resetSwissTrafficCacheForTests();
		vi.restoreAllMocks();
	});

	it('returns unavailable when both keyless feeds fail (no fake segments)', async () => {
		const fetchFn = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
		const result = await loadSwissTraffic(fetchFn);
		expect(result.source).toBe('unavailable');
		expect(result.traffic).toEqual([]);
		expect(result.error).toMatch(/offline|feed|roadworks/i);
	});

	it('parses KTZH Baustellen polygons in the Zürich bowl', async () => {
		const ktzh = {
			type: 'FeatureCollection',
			features: [
				{
					id: 'zh-1',
					properties: {
						strassenname: 'Hardbrücke',
						gemeindename: 'Zürich',
						verkehrsfuehrung: 'Vollsperrung Richtung Norden',
						beschreibung: 'Baustelle'
					},
					geometry: {
						type: 'Polygon',
						coordinates: [
							[
								[8.52, 47.39],
								[8.53, 47.39],
								[8.53, 47.391],
								[8.52, 47.391],
								[8.52, 47.39]
							]
						]
					}
				},
				{
					id: 'be-skip',
					properties: {
						strassenname: 'Bern skip',
						gemeindename: 'Bern',
						verkehrsfuehrung: 'Einspurig'
					},
					geometry: {
						type: 'Polygon',
						coordinates: [
							[
								[7.44, 46.94],
								[7.45, 46.94],
								[7.45, 46.95],
								[7.44, 46.95],
								[7.44, 46.94]
							]
						]
					}
				}
			]
		};

		const fetchFn = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.includes('maps.zh.ch')) {
				return {
					ok: true,
					status: 200,
					json: async () => ktzh
				};
			}
			// Overpass fails — KTZH alone is enough.
			return { ok: false, status: 503, json: async () => ({}) };
		}) as unknown as typeof fetch;

		const result = await loadSwissTraffic(fetchFn);
		expect(result.source).toBe('zh-roadworks');
		expect(result.error).toBe('');
		expect(result.traffic).toHaveLength(1);
		expect(result.traffic[0].name).toBe('Hardbrücke');
		expect(result.traffic[0].level).toBe('jam');
		expect(result.traffic[0].modeled).toBe(false);
		expect(result.traffic[0].coordinates.length).toBeGreaterThanOrEqual(2);
	});

	it('keeps point sites as short stubs (no river-spanning diagonals)', async () => {
		const ktzh = {
			type: 'FeatureCollection',
			features: [
				{
					id: 'pt-1',
					properties: {
						strassenname: 'Quaibrücke',
						gemeindename: 'Zürich',
						verkehrsfuehrung: 'Baustelle',
						beschreibung: 'Punkt'
					},
					geometry: { type: 'Point', coordinates: [8.543, 47.367] }
				}
			]
		};
		const fetchFn = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.includes('maps.zh.ch')) {
				return { ok: true, status: 200, json: async () => ktzh };
			}
			return { ok: false, status: 503, json: async () => ({}) };
		}) as unknown as typeof fetch;

		const result = await loadSwissTraffic(fetchFn);
		expect(result.traffic).toHaveLength(1);
		const [a, b] = result.traffic[0].coordinates;
		const spanM =
			Math.hypot((b[0] - a[0]) * 85_000, (b[1] - a[1]) * 111_320);
		expect(spanM).toBeLessThan(50);
		expect(a[1]).toBeCloseTo(b[1], 6);
	});

	it('merges OSM construction ways when Overpass responds', async () => {
		const fetchFn = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			if (url.includes('maps.zh.ch')) {
				return {
					ok: true,
					status: 200,
					json: async () => ({ type: 'FeatureCollection', features: [] })
				};
			}
			if (init?.method === 'POST' || url.includes('overpass')) {
				return {
					ok: true,
					status: 200,
					json: async () => ({
						elements: [
							{
								type: 'way',
								id: 99,
								tags: { highway: 'construction', name: 'Teststrasse', construction: 'primary' },
								geometry: [
									{ lat: 47.37, lon: 8.54 },
									{ lat: 47.371, lon: 8.541 }
								]
							}
						]
					})
				};
			}
			return { ok: false, status: 404, json: async () => ({}) };
		}) as unknown as typeof fetch;

		const result = await loadSwissTraffic(fetchFn);
		expect(result.source).toBe('zh-roadworks');
		expect(result.traffic).toHaveLength(1);
		expect(result.traffic[0].id).toBe('osm-99');
		expect(result.traffic[0].level).toBe('slow');
	});
});
