export type PlaceCategory = 'attraction' | 'restaurant' | 'shop';

export type Place = {
	id: string;
	name: string;
	category: PlaceCategory;
	lat: number;
	lon: number;
	subtitle: string;
	openHint: string;
	tags: string[];
};

export const CATEGORY_LABEL: Record<PlaceCategory, string> = {
	attraction: 'Attractions',
	restaurant: 'Food & drink',
	shop: 'Stores'
};

export const CATEGORY_COLOR: Record<PlaceCategory, string> = {
	attraction: '#d9480f',
	restaurant: '#0ca678',
	shop: '#ae3ec9'
};

export const ZURICH_CENTER: [number, number] = [8.5417, 47.3769];

/** Curated open places used when Overpass is slow or unavailable. */
export const FALLBACK_PLACES: Place[] = [
	{
		id: 'grossmuenster',
		name: 'Grossmünster',
		category: 'attraction',
		lat: 47.3701,
		lon: 8.5441,
		subtitle: 'Romanesque twin-tower landmark above the Limmat',
		openHint: 'Towers usually open daytime',
		tags: ['landmark', 'church', 'old town']
	},
	{
		id: 'fraumuenster',
		name: 'Fraumünster',
		category: 'attraction',
		lat: 47.3697,
		lon: 8.5412,
		subtitle: 'Chagall windows on Münsterhof',
		openHint: 'Open most days for visitors',
		tags: ['church', 'art']
	},
	{
		id: 'lindenhof',
		name: 'Lindenhof',
		category: 'attraction',
		lat: 47.373,
		lon: 8.5408,
		subtitle: 'Hilltop park with old-town overlook',
		openHint: 'Always open',
		tags: ['viewpoint', 'park']
	},
	{
		id: 'kunsthaus',
		name: 'Kunsthaus Zürich',
		category: 'attraction',
		lat: 47.3704,
		lon: 8.5486,
		subtitle: 'Major art museum by Heimplatz',
		openHint: 'Closed Mondays',
		tags: ['museum', 'art']
	},
	{
		id: 'landesmuseum',
		name: 'Swiss National Museum',
		category: 'attraction',
		lat: 47.3792,
		lon: 8.5402,
		subtitle: 'Castle-like museum at the main station',
		openHint: 'Closed Mondays',
		tags: ['museum', 'history']
	},
	{
		id: 'oper',
		name: 'Zürich Opera House',
		category: 'attraction',
		lat: 47.3651,
		lon: 8.5471,
		subtitle: 'Belle Époque house on Sechseläutenplatz',
		openHint: 'Box office hours vary',
		tags: ['culture', 'theatre']
	},
	{
		id: 'bahnhofstrasse',
		name: 'Bahnhofstrasse',
		category: 'shop',
		lat: 47.3745,
		lon: 8.5388,
		subtitle: 'Flagship shopping spine from HB to the lake',
		openHint: 'Stores typically open weekdays & Sat',
		tags: ['shopping', 'boulevard']
	},
	{
		id: 'globus',
		name: 'Globus Zürich',
		category: 'shop',
		lat: 47.3748,
		lon: 8.5396,
		subtitle: 'Department store on Bahnhofstrasse',
		openHint: 'Open Mon–Sat',
		tags: ['department store']
	},
	{
		id: 'manor',
		name: 'Manor Zürich',
		category: 'shop',
		lat: 47.3741,
		lon: 8.5406,
		subtitle: 'City department store near Bahnhofstrasse',
		openHint: 'Open Mon–Sat',
		tags: ['department store']
	},
	{
		id: 'jelmoli',
		name: 'Jelmoli',
		category: 'shop',
		lat: 47.3744,
		lon: 8.5376,
		subtitle: 'Historic department store with roof terrace',
		openHint: 'Open Mon–Sat',
		tags: ['department store']
	},
	{
		id: 'spruengli',
		name: 'Confiserie Sprüngli',
		category: 'restaurant',
		lat: 47.3699,
		lon: 8.5395,
		subtitle: 'Luxemburgerli café on Paradeplatz',
		openHint: 'Open daily',
		tags: ['cafe', 'sweets']
	},
	{
		id: 'zeughauskeller',
		name: 'Zeughauskeller',
		category: 'restaurant',
		lat: 47.3705,
		lon: 8.5402,
		subtitle: 'Classic Swiss hall near Paradeplatz',
		openHint: 'Open daily for lunch & dinner',
		tags: ['swiss', 'beer hall']
	},
	{
		id: 'kronenhalle',
		name: 'Kronenhalle',
		category: 'restaurant',
		lat: 47.3674,
		lon: 8.5468,
		subtitle: 'Iconic restaurant with art-lined rooms',
		openHint: 'Open daily; reserve ahead',
		tags: ['fine dining']
	},
	{
		id: 'buerkliplatz',
		name: 'Bürkliplatz',
		category: 'attraction',
		lat: 47.3657,
		lon: 8.5408,
		subtitle: 'Lakefront square and boat piers',
		openHint: 'Always open',
		tags: ['lake', 'market']
	},
	{
		id: 'frauenbad',
		name: 'Frauenbad Stadthausquai',
		category: 'attraction',
		lat: 47.3672,
		lon: 8.5417,
		subtitle: 'Historic women-only bathhouse on the Limmat',
		openHint: 'Seasonal bath hours',
		tags: ['bath', 'architecture']
	},
	{
		id: 'polyterrasse',
		name: 'Polyterrasse',
		category: 'attraction',
		lat: 47.3764,
		lon: 8.5476,
		subtitle: 'ETH terrace with city panorama',
		openHint: 'Always open',
		tags: ['viewpoint', 'campus']
	},
	{
		id: 'china_garden',
		name: 'Chinese Garden',
		category: 'attraction',
		lat: 47.3555,
		lon: 8.5517,
		subtitle: 'Gifted garden beside Zürichhorn',
		openHint: 'Seasonal daytime hours',
		tags: ['park', 'garden']
	},
	{
		id: 'rietberg',
		name: 'Museum Rietberg',
		category: 'attraction',
		lat: 47.3589,
		lon: 8.5304,
		subtitle: 'Non-European art in Rieterpark',
		openHint: 'Closed Mondays',
		tags: ['museum']
	},
	{
		id: 'viadukt',
		name: 'Im Viadukt',
		category: 'shop',
		lat: 47.3877,
		lon: 8.5258,
		subtitle: 'Arched market halls in District 5',
		openHint: 'Shops open Tue–Sat; market halls vary',
		tags: ['market', 'design']
	},
	{
		id: 'markthalle',
		name: 'Markthalle Viadukt',
		category: 'restaurant',
		lat: 47.3872,
		lon: 8.5252,
		subtitle: 'Food hall under the railway arches',
		openHint: 'Open daily',
		tags: ['market', 'food hall']
	},
	{
		id: 'josefswiese',
		name: 'Josefswiese',
		category: 'attraction',
		lat: 47.3895,
		lon: 8.5265,
		subtitle: 'Neighborhood park in Kreis 5',
		openHint: 'Always open',
		tags: ['park']
	},
	{
		id: 'prime_tower',
		name: 'Clouds / Prime Tower',
		category: 'restaurant',
		lat: 47.3861,
		lon: 8.5172,
		subtitle: 'Sky bar and dining above Hardbrücke',
		openHint: 'Restaurant hours; views from Clouds',
		tags: ['viewpoint', 'dining']
	},
	{
		id: 'hb',
		name: 'Zürich Hauptbahnhof',
		category: 'attraction',
		lat: 47.3782,
		lon: 8.5402,
		subtitle: 'Main station and ShopVille undercroft',
		openHint: 'Station always open; shops vary',
		tags: ['transit', 'shopping']
	},
	{
		id: 'shopville',
		name: 'ShopVille',
		category: 'shop',
		lat: 47.3778,
		lon: 8.5401,
		subtitle: 'Underground mall beneath the main station',
		openHint: 'Many shops open 7 days',
		tags: ['mall']
	},
	{
		id: 'niederdorf',
		name: 'Niederdorf',
		category: 'attraction',
		lat: 47.3735,
		lon: 8.5445,
		subtitle: 'Laneway old town of cafés and boutiques',
		openHint: 'Streets always open',
		tags: ['old town', 'nightlife']
	},
	{
		id: 'cafe_schober',
		name: 'Café Schober',
		category: 'restaurant',
		lat: 47.3718,
		lon: 8.5448,
		subtitle: 'Historic tea room in Niederdorf',
		openHint: 'Open daily',
		tags: ['cafe']
	},
	{
		id: 'hiltl',
		name: 'Hiltl',
		category: 'restaurant',
		lat: 47.3733,
		lon: 8.5368,
		subtitle: 'World’s oldest vegetarian restaurant',
		openHint: 'Open daily',
		tags: ['vegetarian']
	},
	{
		id: 'beyer',
		name: 'Beyer Clock & Watch Museum',
		category: 'attraction',
		lat: 47.3708,
		lon: 8.5398,
		subtitle: 'Horology museum under Bahnhofstrasse',
		openHint: 'Open weekdays & Sat',
		tags: ['museum']
	},
	{
		id: 'freitag',
		name: 'Freitag Flagship Tower',
		category: 'shop',
		lat: 47.3889,
		lon: 8.5156,
		subtitle: 'Stacked shipping-container shop',
		openHint: 'Open daily',
		tags: ['design', 'bags']
	},
	{
		id: 'enge',
		name: 'Lake Zürich Quays (Enge)',
		category: 'attraction',
		lat: 47.3635,
		lon: 8.5345,
		subtitle: 'Tree-lined promenade toward Mythenquai',
		openHint: 'Always open',
		tags: ['lake', 'walk']
	},
	{
		id: 'ueto',
		name: 'Uetliberg viewpoint',
		category: 'attraction',
		lat: 47.3496,
		lon: 8.4914,
		subtitle: 'City mountain lookout above Zürich',
		openHint: 'Always open; S-Bahn access',
		tags: ['viewpoint', 'hike']
	},
	{
		id: 'plaza',
		name: 'Plaza Zürich',
		category: 'shop',
		lat: 47.3789,
		lon: 8.5355,
		subtitle: 'Retail complex near the station',
		openHint: 'Open Mon–Sat',
		tags: ['shopping']
	}
];

export function placeToFeature(place: Place) {
	return {
		type: 'Feature' as const,
		id: place.id,
		properties: {
			id: place.id,
			name: place.name,
			category: place.category,
			subtitle: place.subtitle,
			openHint: place.openHint
		},
		geometry: {
			type: 'Point' as const,
			coordinates: [place.lon, place.lat]
		}
	};
}

export function placesToGeoJSON(places: Place[]) {
	return {
		type: 'FeatureCollection' as const,
		features: places.map(placeToFeature)
	};
}
