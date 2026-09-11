import type { PageServerLoad } from './$types';
import Parser from 'rss-parser';
import { parseParking } from '$lib/parking';
import { enrichParkings } from '$lib/server/parking-details';

export const config = { runtime: 'nodejs18.x', regions: ['fra1'] };
export const load: PageServerLoad = async ({ fetch, setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store' });
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 10000);
	try {
		const response = await fetch('https://www.pls-zh.ch/plsFeed/rss', {
			cache: 'no-store',
			signal: controller.signal
		});
		if (!response.ok) throw new Error('Feed unavailable');
		const feed = await new Parser().parseString(await response.text());
		clearTimeout(timer);
		const parkings = await enrichParkings(feed.items.map(parseParking), fetch);
		return { parkings, refreshedAt: new Date().toISOString(), error: '' };
	} catch {
		return {
			parkings: [],
			refreshedAt: null,
			error: 'Parking data could not be loaded. Try refreshing again.'
		};
	} finally {
		clearTimeout(timer);
	}
};
