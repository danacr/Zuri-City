import type { PageServerLoad } from './$types';
import Parser from 'rss-parser';
import { parseParking, type Parking } from '$lib/parking';
import { enrichParkings } from '$lib/server/parking-details';
import { loadCityPlaces } from '$lib/server/places';
import { loadIntelSnapshot } from '$lib/server/intel';

export const load: PageServerLoad = async ({ fetch, setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store' });

	const placesPromise = loadCityPlaces(fetch);
	const intelPromise = loadIntelSnapshot(fetch);

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 10000);
	let parkings: Parking[] = [];
	let refreshedAt: string | null = null;
	let parkingError = '';
	try {
		const response = await fetch('https://www.pls-zh.ch/plsFeed/rss', {
			cache: 'no-store',
			signal: controller.signal
		});
		if (!response.ok) throw new Error('Feed unavailable');
		const feed = await new Parser().parseString(await response.text());
		parkings = await enrichParkings(feed.items.map(parseParking), fetch);
		refreshedAt = new Date().toISOString();
	} catch {
		parkingError = 'Parking data could not be loaded. Try refreshing again.';
	} finally {
		clearTimeout(timer);
	}

	const [city, intel] = await Promise.all([placesPromise, intelPromise]);
	return {
		parkings,
		refreshedAt,
		error: parkingError,
		places: city.places,
		placesSource: city.source,
		placesError: city.error,
		intel
	};
};
