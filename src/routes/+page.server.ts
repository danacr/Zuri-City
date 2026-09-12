import type { PageServerLoad } from './$types';
import Parser from 'rss-parser';
import { parseParking, type Parking } from '$lib/parking';
import { enrichParkings } from '$lib/server/parking-details';
import { loadCityPlaces } from '$lib/server/places';
import { loadIntelSnapshot } from '$lib/server/intel';
import { FALLBACK_PLACES } from '$lib/city/places';
import type { IntelSnapshot } from '$lib/intel/types';

const EMPTY_INTEL: IntelSnapshot = {
	flights: [],
	cameras: [],
	traffic: [],
	quakes: [],
	fetchedAt: new Date(0).toISOString(),
	notes: []
};

async function loadParkings(fetchFn: typeof fetch): Promise<{
	parkings: Parking[];
	refreshedAt: string | null;
	error: string;
}> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 10000);
	try {
		const response = await fetchFn('https://www.pls-zh.ch/plsFeed/rss', {
			cache: 'no-store',
			signal: controller.signal
		});
		if (!response.ok) throw new Error('Feed unavailable');
		const feed = await new Parser().parseString(await response.text());
		const parkings = await enrichParkings(feed.items.map(parseParking), fetchFn);
		return {
			parkings,
			refreshedAt: new Date().toISOString(),
			error: ''
		};
	} catch {
		return {
			parkings: [],
			refreshedAt: null,
			error: 'Parking data could not be loaded. Try refreshing again.'
		};
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Sync shell returns immediately so `app.html` boot splash can paint before
 * Overpass / parking RSS / ADS-B finish. Real data arrives via `hydrateCity`.
 */
export const load: PageServerLoad = async ({ fetch, setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store' });

	const placesPromise = loadCityPlaces(fetch);
	const intelPromise = loadIntelSnapshot(fetch).catch(
		(): IntelSnapshot => ({
			...EMPTY_INTEL,
			notes: ['Live intel could not be loaded.'],
			fetchedAt: new Date().toISOString()
		})
	);
	const parkingsPromise = loadParkings(fetch);

	return {
		places: FALLBACK_PLACES,
		placesSource: 'fallback' as const,
		placesError: '',
		parkings: [] as Parking[],
		refreshedAt: null as string | null,
		error: '',
		intel: EMPTY_INTEL,
		hydrateCity: Promise.all([placesPromise, parkingsPromise, intelPromise]).then(
			([city, parking, intel]) => ({
				places: city.places,
				placesSource: city.source,
				placesError: city.error,
				parkings: parking.parkings,
				refreshedAt: parking.refreshedAt,
				error: parking.error,
				intel
			})
		)
	};
};
