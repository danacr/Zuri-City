export type PlaceCategory =
	| 'sights'
	| 'culture'
	| 'outdoors'
	| 'food'
	| 'cafe'
	| 'nightlife'
	| 'shop'
	| 'daily'
	| 'wellness'
	| 'beauty'
	| 'stay';

export type Place = {
	id: string;
	name: string;
	category: PlaceCategory;
	lat: number;
	lon: number;
	subtitle: string;
	openHint: string;
	openingHours: string | null;
	isOpen: boolean | null;
	tags: string[];
};

export const PLACE_CATEGORIES: PlaceCategory[] = [
	'sights',
	'culture',
	'outdoors',
	'food',
	'cafe',
	'nightlife',
	'shop',
	'daily',
	'wellness',
	'beauty',
	'stay'
];

export const CATEGORY_LABEL: Record<PlaceCategory, string> = {
	sights: 'Sights',
	culture: 'Culture',
	outdoors: 'Outdoors',
	food: 'Food',
	cafe: 'Cafés',
	nightlife: 'Nightlife',
	shop: 'Shops',
	daily: 'Essentials',
	wellness: 'Wellness',
	beauty: 'Beauty',
	stay: 'Stay'
};

export const CATEGORY_COLOR: Record<PlaceCategory, string> = {
	sights: '#d9480f',
	culture: '#9c36b5',
	outdoors: '#2f9e44',
	food: '#e8590c',
	cafe: '#f08c00',
	nightlife: '#5f3dc4',
	shop: '#1971c2',
	daily: '#0c8599',
	wellness: '#0ca678',
	beauty: '#e64980',
	stay: '#7048e8'
};

/**
 * Lower = placed first in MapLibre collision (landmarks before shops).
 * Used for symbol-sort-key so dense Overpass loads still read as a city.
 */
export const CATEGORY_SORT_KEY: Record<PlaceCategory, number> = {
	sights: 0,
	culture: 1,
	outdoors: 2,
	food: 3,
	cafe: 4,
	stay: 5,
	nightlife: 6,
	wellness: 7,
	beauty: 8,
	shop: 9,
	daily: 10
};

/** MapLibre match expression for category colors. */
export function categoryColorExpression(fallback = '#868e96'): unknown[] {
	return [
		'match',
		['get', 'category'],
		...PLACE_CATEGORIES.flatMap((category) => [category, CATEGORY_COLOR[category]]),
		fallback
	];
}

export const ZURICH_CENTER: [number, number] = [8.5417, 47.3769];
