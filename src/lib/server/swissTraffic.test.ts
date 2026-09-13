import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({
	env: {} as Record<string, string>
}));

import { env } from '$env/dynamic/private';
import { loadSwissTraffic, resetSwissTrafficCacheForTests } from './swissTraffic';

describe('loadSwissTraffic', () => {
	beforeEach(() => {
		for (const key of Object.keys(env)) delete env[key];
		resetSwissTrafficCacheForTests();
		vi.restoreAllMocks();
	});

	it('returns unavailable without an API key (no fake segments)', async () => {
		const result = await loadSwissTraffic(vi.fn() as unknown as typeof fetch);
		expect(result.source).toBe('unavailable');
		expect(result.traffic).toEqual([]);
		expect(result.error).toMatch(/Traffic unavailable/i);
	});

	it('parses Zürich-bbox sites and speed → free/slow/jam', async () => {
		env.OPENTRANSPORTDATA_API_KEY = 'test-key';
		const sitesXml = `<?xml version="1.0"?>
		<root>
		  <measurementSiteRecord id="CH.ZH.1">
		    <measurementSiteName><value>Nordring</value></measurementSiteName>
		    <latitude>47.41</latitude><longitude>8.55</longitude>
		  </measurementSiteRecord>
		  <measurementSiteRecord id="CH.BE.1">
		    <measurementSiteName><value>Bern skip</value></measurementSiteName>
		    <latitude>46.95</latitude><longitude>7.45</longitude>
		  </measurementSiteRecord>
		</root>`;
		const dataXml = `<?xml version="1.0"?>
		<root>
		  <siteMeasurements>
		    <measurementSiteReference id="CH.ZH.1"/>
		    <speed>72.5</speed>
		  </siteMeasurements>
		</root>`;

		const fetchFn = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				text: async () => sitesXml
			})
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				text: async () => dataXml
			}) as unknown as typeof fetch;

		const result = await loadSwissTraffic(fetchFn);
		expect(result.source).toBe('astra-datex');
		expect(result.error).toBe('');
		expect(result.traffic).toHaveLength(1);
		expect(result.traffic[0].level).toBe('free');
		expect(result.traffic[0].modeled).toBe(false);
		expect(result.traffic[0].name).toBe('Nordring');
		expect(result.traffic[0].coordinates.length).toBeGreaterThanOrEqual(2);
	});
});
