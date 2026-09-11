import type { PageServerLoad } from './$types';
import Parser from 'rss-parser';
import { parseParking } from '$lib/parking';

export const config = { runtime: 'nodejs18.x', regions: ['fra1'] };

export const load: PageServerLoad = async () => {
	const parser = new Parser({ timeout: 10000 });
	try {
		const feed = await parser.parseURL('https://www.pls-zh.ch/plsFeed/rss');
		return { parkings: feed.items.map(parseParking), error: '' };
	} catch {
		return {
			parkings: [],
			error: 'Parking availability could not be loaded. Please reload to try again.'
		};
	}
};
