import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loadFlights, loadQuakes } from '$lib/server/intel';
import { TRAFFIC_CORRIDORS, ZURICH_CAMERAS, jitterTraffic } from '$lib/intel/cameras';

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
		return json({
			traffic: jitterTraffic(TRAFFIC_CORRIDORS),
			fetchedAt: new Date().toISOString(),
			modeled: true
		});
	}
	if (layer === 'cameras') {
		return json({ cameras: ZURICH_CAMERAS, fetchedAt: new Date().toISOString() });
	}

	const [flights, quakes] = await Promise.all([loadFlights(fetch), loadQuakes(fetch)]);
	return json({
		flights: flights.flights,
		quakes: quakes.quakes,
		traffic: jitterTraffic(TRAFFIC_CORRIDORS),
		cameras: ZURICH_CAMERAS,
		fetchedAt: new Date().toISOString(),
		notes: [flights.error, quakes.error].filter(Boolean)
	});
};
