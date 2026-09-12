import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ZURICH_CAMERAS } from '$lib/intel/cameras';
import { loadFlights, loadQuakes } from '$lib/server/intel';

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
		// Road geometry is OpenMapTiles on the client — no custom corridor payload.
		return json({
			traffic: [],
			fetchedAt: new Date().toISOString(),
			modeled: true,
			source: 'openmaptiles-transportation'
		});
	}
	if (layer === 'cameras') {
		return json({ cameras: ZURICH_CAMERAS, fetchedAt: new Date().toISOString() });
	}

	const [flights, quakes] = await Promise.all([loadFlights(fetch), loadQuakes(fetch)]);
	return json({
		flights: flights.flights,
		quakes: quakes.quakes,
		traffic: [],
		cameras: ZURICH_CAMERAS,
		fetchedAt: new Date().toISOString(),
		notes: [flights.error, quakes.error].filter(Boolean)
	});
};
