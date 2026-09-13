import { expect, it } from 'vitest';
import { load } from './+page.server';

it('discovers newly added garages on the next load without a fixed count or ID list', async () => {
	let garageCount = 36;
	let latitude = 47.4;
	let feedRequests = 0;
	const metadataRequests: string[] = [];
	const headers: Record<string, string>[] = [];
	const fetcher: typeof fetch = async (input, init) => {
		const url = String(input);
		if (url.includes('api.adsb.lol') || url.includes('earthquake.usgs.gov')) {
			return new Response(JSON.stringify(url.includes('adsb') ? { ac: [] } : { features: [] }), {
				headers: { 'content-type': 'application/json' }
			});
		}
		expect(init?.cache).toBe('no-store');
		if (url.includes('overpass-api.de') || url.includes('overpass')) {
			return new Response('{"elements":[]}', {
				headers: { 'content-type': 'application/json' }
			});
		}
		if (url.includes('maps.zh.ch')) {
			return new Response(JSON.stringify({ type: 'FeatureCollection', features: [] }), {
				headers: { 'content-type': 'application/json' }
			});
		}
		if (url.endsWith('/plsFeed/rss')) {
			feedRequests++;
			const items = Array.from(
				{ length: garageCount },
				(_, index) => `
    <item>
     <title>Garage ${index} / Example Street ${index}</title>
     <link>https://www.pls-zh.ch/parkhaus/garage-${index}.jsp?pid=garage-${index}</link>
     <description>${index % 2 ? 'closed' : 'open'} / 12</description>
    </item>`
			).join('');
			return new Response(
				`<rss version="2.0"><channel><title>Parking</title>${items}</channel></rss>`
			);
		}
		metadataRequests.push(url);
		return new Response(
			url.includes('parkhausmap.jsp') ? `var str = '${latitude}, 8.5';` : '<td>100 Plätze</td>'
		);
	};
	const event = {
		fetch: fetcher,
		setHeaders: (value: Record<string, string>) => {
			headers.push(value);
		}
	} as unknown as Parameters<typeof load>[0];

	type Shell = {
		parkings: unknown[];
		hydrateCity: Promise<{
			parkings: Array<{
				id: string;
				free: number | null;
				capacity: number | null;
				coordinates: [number, number] | null;
				status: string;
			}>;
			error: string;
		}>;
	};

	const firstShell = (await load(event)) as Shell;
	// Sync shell starts empty — parking always hydrates from live PLS.
	expect(firstShell.parkings).toHaveLength(0);
	const first = await firstShell.hydrateCity;
	expect(first.parkings).toHaveLength(36);

	garageCount = 43;
	latitude = 47.5;
	metadataRequests.length = 0;
	const refreshedShell = (await load(event)) as Shell;
	const refreshed = await refreshedShell.hydrateCity;
	expect(refreshed?.error).toBe('');
	expect(refreshed?.parkings).toHaveLength(43);
	expect(refreshed?.parkings[42]).toMatchObject({
		id: 'garage-42',
		free: 12,
		capacity: 100,
		coordinates: [47.5, 8.5]
	});
	expect(refreshed?.parkings[41].status).toBe('closed');
	// Existing garage locations are refreshed too, and all new entries get map coordinates.
	expect(first?.parkings[0].coordinates).toEqual([47.4, 8.5]);
	for (let index = 0; index < garageCount; index++) {
		expect(refreshed?.parkings[index].coordinates).toEqual([47.5, 8.5]);
		expect(metadataRequests).toContain(
			`https://www.pls-zh.ch/parkhaus/parkhausmap.jsp?pid=garage-${index}`
		);
	}
	expect(metadataRequests).toHaveLength(43 * 2);
	expect(feedRequests).toBe(2);
	expect(headers).toEqual([{ 'cache-control': 'no-store' }, { 'cache-control': 'no-store' }]);
});
