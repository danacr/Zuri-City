import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loadPlacesInBbox } from '$lib/server/places';

export const GET: RequestHandler = async ({ fetch, url, setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store' });

	const west = Number(url.searchParams.get('west'));
	const south = Number(url.searchParams.get('south'));
	const east = Number(url.searchParams.get('east'));
	const north = Number(url.searchParams.get('north'));
	const zoom = Number(url.searchParams.get('zoom') || '15');

	if (![west, south, east, north].every((value) => Number.isFinite(value))) {
		return json({ places: [], error: 'Invalid bbox' }, { status: 400 });
	}
	if (east <= west || north <= south) {
		return json({ places: [], error: 'Invalid bbox order' }, { status: 400 });
	}

	// Keep Overpass payloads bounded — reject city-wide accidental requests.
	const span = Math.max(east - west, north - south);
	if (span > 0.35) {
		return json({ places: [], error: 'Bbox too large — zoom in' }, { status: 400 });
	}

	const result = await loadPlacesInBbox(fetch, { west, south, east, north }, zoom);
	return json({
		places: result.places,
		source: result.source,
		error: result.error,
		fetchedAt: new Date().toISOString()
	});
};
