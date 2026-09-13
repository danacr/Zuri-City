import type { PageServerLoad } from './$types';
import Parser from 'rss-parser';
import {
	assistParkingCoordinates,
	parseParking,
	type Parking
} from '$lib/parking';
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
	const timer = setTimeout(() => controller.abort(), 12000);
	try {
		const parsed = await fetchPlsFeed(fetchFn, controller.signal);
		const enriched = await enrichParkings(parsed, fetchFn);
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
		/**
		 * Resolve as soon as PLS is ready. Do not await dense Overpass here —
		 * places soft-seed from fallback and merge later via `hydratePlaces`.
		 */
		hydrateCity: (async () => {
			const [parking, intel] = await Promise.all([
				parkingsPromise,
				Promise.race([
					intelPromise,
					new Promise<IntelSnapshot>((resolve) =>
						setTimeout(
							() =>
								resolve({
									...EMPTY_INTEL,
									fetchedAt: new Date().toISOString(),
									notes: ['Live intel still loading — traffic will fill in shortly.']
								}),
							4_000
						)
					)
				])
			]);
			// Peek places only if already resolved; never delay PLS for Overpass.
			const peeked = await Promise.race([
				placesPromise,
				Promise.resolve(null as Awaited<typeof placesPromise> | null)
			]);
			const city =
				peeked ??
				({
					places: FALLBACK_PLACES,
					source: 'fallback' as const,
					error: ''
				} satisfies Awaited<typeof placesPromise>);
			return {
				places: city.places,
				placesSource: city.source,
				placesError: city.error,
				parkings: parking.parkings,
				refreshedAt: parking.refreshedAt,
				error: parking.error,
				intel
			};
		})(),
		/** Full Overpass city load — merges after PLS paints. */
		hydratePlaces: placesPromise
	};
};
