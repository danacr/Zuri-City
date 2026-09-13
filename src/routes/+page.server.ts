import type { PageServerLoad } from './$types';
import Parser from 'rss-parser';
import {
	assistParkingCoordinates,
	parseParking,
	type Parking
} from '$lib/parking';
import { enrichParkings } from '$lib/server/parking-details';
import { loadIntelSnapshot } from '$lib/server/intel';
import { FALLBACK_PLACES } from '$lib/city/places';
import type { IntelSnapshot } from '$lib/intel/types';

/** Stay under Vercel ~10s; hydrate soft-timeout is 6s. */
const PLS_BUDGET_MS = 5_500;

const EMPTY_INTEL: IntelSnapshot = {
	flights: [],
	cameras: [],
	traffic: [],
	quakes: [],
	fetchedAt: new Date(0).toISOString(),
	notes: []
};

const PLS_FEED_URLS = [
	'https://www.pls-zh.ch/plsFeed/rss',
	'https://www.pls-zh.ch/plsFeed/rss.xml'
];

function withCoordinates(parkings: Parking[]): Parking[] {
	return parkings.filter((parking) => parking.coordinates !== null);
}

async function fetchPlsFeed(fetchFn: typeof fetch, signal: AbortSignal): Promise<Parking[]> {
	let lastError: unknown;
	for (const url of PLS_FEED_URLS) {
		try {
			const response = await fetchFn(url, { cache: 'no-store', signal });
			if (!response.ok) throw new Error(`Feed ${response.status}`);
			const feed = await new Parser().parseString(await response.text());
			return feed.items.map(parseParking);
		} catch (error) {
			lastError = error;
		}
	}
	throw lastError instanceof Error ? lastError : new Error('PLS feed unavailable');
}

async function loadParkings(fetchFn: typeof fetch): Promise<{
	parkings: Parking[];
	refreshedAt: string | null;
	error: string;
}> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), PLS_BUDGET_MS);
	try {
		const parsed = await fetchPlsFeed(fetchFn, controller.signal);
		const enriched = await enrichParkings(parsed, fetchFn, controller.signal);
		const assisted = assistParkingCoordinates(enriched);
		const located = withCoordinates(assisted);
		if (located.length === 0) {
			return {
				parkings: [],
				refreshedAt: null,
				error: 'Live parking loaded but no garage coordinates yet — retry shortly.'
			};
		}
		return {
			parkings: located,
			refreshedAt: new Date().toISOString(),
			error: located.length < assisted.length
				? `Showing ${located.length} garages with map locations (${assisted.length - located.length} still locating).`
				: ''
		};
	} catch {
		return {
			parkings: [],
			refreshedAt: null,
			error: 'Live parking feed unavailable — retry or refresh.'
		};
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Sync shell returns immediately so `app.html` boot splash can paint.
 * Parking starts empty — hydrate always loads dynamic PLS (never curated landmarks).
 */
export const load: PageServerLoad = async ({ fetch, setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store' });

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
		/**
		 * PLS only — never start Overpass in this serverless load.
		 * A deferred places promise would keep the Vercel function open past the
		 * ~10s ceiling and kill parking with it. Dense OSM comes from /api/places.
		 */
		hydrateCity: (async () => {
			const emptyParking = {
				parkings: [] as Parking[],
				refreshedAt: null as string | null,
				error: 'Parking still loading.'
			};
			const [parking, intel] = await Promise.all([
				Promise.race([
					parkingsPromise,
					new Promise<typeof emptyParking>((resolve) =>
						setTimeout(() => resolve(emptyParking), 6_000)
					)
				]),
				Promise.race([
					intelPromise,
					new Promise<IntelSnapshot>((resolve) =>
						setTimeout(
							() =>
								resolve({
									...EMPTY_INTEL,
									fetchedAt: new Date().toISOString(),
									notes: ['Live intel still loading — roadworks will fill in shortly.']
								}),
							4_000
						)
					)
				])
			]);
			return {
				places: FALLBACK_PLACES,
				placesSource: 'fallback' as const,
				placesError: '',
				parkings: parking.parkings,
				refreshedAt: parking.refreshedAt,
				error: parking.error,
				intel
			};
		})()
	};
};
