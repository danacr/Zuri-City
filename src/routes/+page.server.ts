import type { PageServerLoad } from './$types';
import Parser from 'rss-parser';
import { FALLBACK_PARKINGS, parseParking, type Parking } from '$lib/parking';
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

function withCoordinates(parkings: Parking[]): Parking[] {
	return parkings.filter((parking) => parking.coordinates !== null);
}

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
		const located = withCoordinates(parkings);
		if (located.length === 0) {
			return {
				parkings: FALLBACK_PARKINGS,
				refreshedAt: new Date().toISOString(),
				error: 'Live parking had no map locations — showing curated Zürich garages.'
			};
		}
		return {
			parkings: located,
			refreshedAt: new Date().toISOString(),
			error: ''
		};
	} catch {
		return {
			parkings: FALLBACK_PARKINGS,
			refreshedAt: null,
			error: 'Live parking feed unavailable — showing curated Zürich garages.'
		};
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Sync shell returns immediately so `app.html` boot splash can paint before
 * Overpass / parking RSS / ADS-B finish. Real data arrives via `hydrateCity`.
 * Seed parking with curated coords so capacity pills exist before hydrate.
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
		parkings: FALLBACK_PARKINGS,
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
