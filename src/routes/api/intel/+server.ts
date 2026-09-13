import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ZURICH_CAMERAS } from '$lib/intel/cameras';
import { loadFlights, loadIntelSnapshot, loadQuakes } from '$lib/server/intel';
import { loadSwissTraffic } from '$lib/server/swissTraffic';

export const GET: RequestHandler = async ({ fetch, url, setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store' });
	const layer = url.searchParams.get('layer') || 'all';

	if (layer === 'flights') {
		const result = await loadFlights(fetch);
		return json({ ...result, fetchedAt: new Date().toISOString() });
	}
	if (layer === 'quakes') {
		const result = await loadQuakes(fetch);
		return json({ ...result, fetchedAt: new Date().toISOString() });
	}
	if (layer === 'traffic') {
		const result = await loadSwissTraffic(fetch);
		return json({
			traffic: result.traffic,
			fetchedAt: new Date().toISOString(),
			modeled: false,
			source: result.source,
			error: result.error || undefined
		});
	}
	if (layer === 'cameras') {
		return json({ cameras: ZURICH_CAMERAS, fetchedAt: new Date().toISOString() });
	}

	const snapshot = await loadIntelSnapshot(fetch);
	return json(snapshot);
};
