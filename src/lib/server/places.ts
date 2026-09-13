import {
	FALLBACK_PLACES,
	PLACE_CATEGORIES,
	ZURICH_CENTER,
	haversineMeters,
	type Place,
	type PlaceCategory
} from '$lib/city/places';
import { evaluateOpenNow, openBadge as openStatusBadge } from '$lib/city/openingHours';

const OVERPASS_ENDPOINTS = [
	'https://overpass.openstreetmap.fr/api/interpreter',
	'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
	'https://overpass-api.de/api/interpreter',
	'https://overpass.kumi.systems/api/interpreter'
];

/** ~3.8 km around Zürich HB — dense nearby coverage of the city core. */
const AROUND_NEAR = `around:8000,${ZURICH_CENTER[1]},${ZURICH_CENTER[0]}`;
/** Slightly wider ring for sights / parks / hotels. */
const AROUND_WIDE = `around:11000,${ZURICH_CENTER[1]},${ZURICH_CENTER[0]}`;

/**
 * Cap POI density so first orbit reads as a city, not sticker soup.
 * Collision + label minzoom handle the rest; seeds still merge via dedupe.
 */
const MAX_PER_CATEGORY = 140;

type OverpassElement = {
	type: string;
	id: number;
	lat?: number;
	lon?: number;
	center?: { lat: number; lon: number };
	tags?: Record<string, string>;
};

/** Client abort for Overpass POSTs — keep under Vercel ~10s for /api/places. */
const OVERPASS_ABORT_MS = 8_000;

/** Split queries stay under Overpass timeouts while covering many nearby open venues. */
const QUERY_BUNDLES = [
	`
[out:json][timeout:8];
(
  node["amenity"~"restaurant|fast_food|biergarten|food_court|cafe|ice_cream|bar|pub|nightclub"](${AROUND_NEAR});
  node["shop"~"bakery|pastry|coffee|chocolate|confectionery"](${AROUND_NEAR});
  way["amenity"~"restaurant|fast_food|cafe|bar|pub"](${AROUND_NEAR});
  way["shop"~"bakery|pastry|coffee"](${AROUND_NEAR});
);
out center 1200;
`.trim(),
	`
[out:json][timeout:8];
(
  node["shop"~"hairdresser|beauty|nails|massage|cosmetics|perfumery|tattoo|piercing"](${AROUND_NEAR});
  node["craft"="hairdresser"](${AROUND_NEAR});
  node["beauty"](${AROUND_NEAR});
  node["amenity"="beauty_salon"](${AROUND_NEAR});
);
out body 800;
`.trim(),
	`
[out:json][timeout:8];
(
  node["shop"~"clothes|shoes|books|jewelry|gift|electronics|fashion_accessories|department_store|mall|bicycle|sports|florist|furniture|optician|mobile_phone|computer|toys|music|convenience|supermarket|chemist|kiosk|greengrocer|butcher|dairy"](${AROUND_NEAR});
  node["amenity"~"pharmacy|bank|atm|post_office|fuel|charging_station|bicycle_rental|car_sharing|toilets|drinking_water"](${AROUND_NEAR});
  node["amenity"="marketplace"](${AROUND_NEAR});
);
out body 1200;
`.trim(),
	`
[out:json][timeout:8];
(
  node["tourism"~"attraction|museum|viewpoint|gallery|artwork|zoo|theme_park|hotel|hostel|apartment"](${AROUND_WIDE});
  node["historic"~"monument|castle|memorial|ruins|archaeological_site"](${AROUND_WIDE});
  node["amenity"~"theatre|cinema|arts_centre|library|community_centre|place_of_worship|fountain|public_bath"](${AROUND_WIDE});
  node["leisure"~"park|garden|nature_reserve|swimming_area|marina|playground|sports_centre|fitness_centre|swimming_pool|sauna|beach_resort"](${AROUND_WIDE});
  way["leisure"~"park|garden|nature_reserve"](${AROUND_WIDE});
  way["tourism"~"attraction|museum"](${AROUND_WIDE});
);
out center 1000;
`.trim(),
	`
[out:json][timeout:8];
(
  node["shop"]["name"](${AROUND_NEAR});
  node["amenity"]["name"](${AROUND_NEAR});
  node["office"]["name"](${AROUND_NEAR});
  node["craft"]["name"](${AROUND_NEAR});
);
out body 1500;
`.trim()
];

function categorize(tags: Record<string, string>): PlaceCategory | null {
	const tourism = tags.tourism || '';
	const amenity = tags.amenity || '';
	const shop = tags.shop || '';
	const leisure = tags.leisure || '';
	const historic = tags.historic || '';
	const natural = tags.natural || '';

	if (
		['public_bath', 'sauna'].includes(amenity) ||
		['fitness_centre', 'swimming_pool', 'sauna', 'sports_centre', 'beach_resort'].includes(leisure)
	) {
		return 'wellness';
	}
	if (
		['hairdresser', 'beauty', 'nails', 'massage', 'cosmetics', 'perfumery', 'tattoo', 'piercing'].includes(
			shop
		) ||
		amenity === 'beauty_salon' ||
		tags.craft === 'hairdresser' ||
		Boolean(tags.beauty)
	) {
		return 'beauty';
	}
	if (['hotel', 'hostel', 'apartment', 'guest_house'].includes(tourism)) return 'stay';
	if (
		['pharmacy', 'bank', 'atm', 'post_office', 'fuel', 'charging_station', 'bicycle_rental', 'car_sharing', 'toilets', 'drinking_water'].includes(
			amenity
		)
	) {
		return 'daily';
	}
	if (['supermarket', 'convenience', 'chemist', 'kiosk', 'greengrocer', 'butcher', 'dairy'].includes(shop)) {
		return 'daily';
	}
	if (amenity === 'marketplace') return 'daily';
	if (['bar', 'pub', 'nightclub'].includes(amenity)) return 'nightlife';
	if (
		['cafe', 'ice_cream'].includes(amenity) ||
		['bakery', 'pastry', 'coffee', 'chocolate', 'confectionery'].includes(shop)
	) {
		return 'cafe';
	}
	if (['restaurant', 'fast_food', 'biergarten', 'food_court'].includes(amenity)) return 'food';
	if (
		['museum', 'gallery'].includes(tourism) ||
		['theatre', 'cinema', 'arts_centre', 'library', 'community_centre'].includes(amenity)
	) {
		return 'culture';
	}
	if (
		['park', 'garden', 'nature_reserve', 'swimming_area', 'marina', 'playground'].includes(leisure) ||
		amenity === 'fountain' ||
		natural === 'beach' ||
		tourism === 'picnic_site'
	) {
		return 'outdoors';
	}
	if (
		['attraction', 'viewpoint', 'artwork', 'zoo', 'theme_park'].includes(tourism) ||
		['monument', 'castle', 'memorial', 'ruins', 'archaeological_site'].includes(historic) ||
		amenity === 'place_of_worship'
	) {
		return 'sights';
	}
	if (shop) return 'shop';
	// Named amenity / office / craft catch-all so the map feels lived-in, not curated.
	if (amenity) return 'daily';
	if (tags.office || tags.craft) return 'shop';
	return null;
}

function subtitleFor(tags: Record<string, string>, category: PlaceCategory): string {
	if (tags.description) return tags.description.slice(0, 120);
	if (category === 'food' || category === 'cafe' || category === 'nightlife') {
		const cuisine = tags.cuisine?.replaceAll(';', ', ');
		if (cuisine) return cuisine.charAt(0).toUpperCase() + cuisine.slice(1);
		return (tags.amenity || tags.shop || category).replaceAll('_', ' ');
	}
	if (category === 'shop' || category === 'daily') {
		return (tags.shop || tags.amenity || 'Shop').replaceAll('_', ' ');
	}
	if (category === 'outdoors') {
		return (tags.leisure || tags.tourism || tags.natural || 'Outdoors').replaceAll('_', ' ');
	}
	if (category === 'wellness') {
		return (tags.leisure || tags.amenity || 'Wellness').replaceAll('_', ' ');
	}
	if (category === 'beauty') {
		if (tags.beauty) return tags.beauty.replaceAll(';', ', ').replaceAll('_', ' ');
		if (tags.shop === 'hairdresser' || tags.craft === 'hairdresser') return 'Hair salon';
		if (tags.shop === 'nails') return 'Nail salon';
		if (tags.shop === 'beauty') return 'Beauty salon';
		if (tags.shop === 'cosmetics') return 'Cosmetics';
		if (tags.shop === 'perfumery') return 'Perfumery';
		if (tags.shop === 'massage') return 'Massage';
		return (tags.shop || tags.amenity || 'Beauty').replaceAll('_', ' ');
	}
	if (category === 'stay') {
		return (tags.tourism || 'Stay').replaceAll('_', ' ');
	}
	return (tags.tourism || tags.historic || tags.amenity || tags.leisure || 'Zürich place').replaceAll(
		'_',
		' '
	);
}

function fromElement(element: OverpassElement): Place | null {
	const tags = element.tags || {};
	const name = tags.name || tags['name:en'] || tags['name:de'];
	if (!name) return null;
	const category = categorize(tags);
	if (!category) return null;
	const lat = element.lat ?? element.center?.lat;
	const lon = element.lon ?? element.center?.lon;
	if (lat == null || lon == null) return null;
	const openingHours = tags.opening_hours || null;
	const isOpen =
		evaluateOpenNow(openingHours) ??
		((category === 'outdoors' || category === 'sights') && !openingHours ? true : null);
	const openHint = openingHours
		? `${openStatusBadge(isOpen)} · ${openingHours}`
		: category === 'outdoors'
			? 'Open now · outdoor'
			: openStatusBadge(isOpen);
	return {
		id: `osm-${element.type}-${element.id}`,
		name,
		category,
		lat,
		lon,
		subtitle: subtitleFor(tags, category),
		openingHours,
		isOpen,
		openHint,
		phone: tags.phone || tags['contact:phone'] || null,
		website: tags.website || tags['contact:website'] || tags.url || null,
		tags: [
			category,
			tags.amenity,
			tags.shop,
			tags.tourism,
			tags.leisure,
			tags.historic
		].filter(Boolean) as string[]
	};
}

function dedupe(places: Place[]): Place[] {
	const seen = new Set<string>();
	const out: Place[] = [];
	for (const place of places) {
		const key = `${place.name.toLowerCase()}|${place.lat.toFixed(4)}|${place.lon.toFixed(4)}`;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(place);
	}
	return out;
}

function rankNearbyOpen(places: Place[], origin: [number, number] = ZURICH_CENTER): Place[] {
	return [...places].sort((a, b) => {
		const distDiff =
			haversineMeters(origin, [a.lon, a.lat]) - haversineMeters(origin, [b.lon, b.lat]);
		if (Math.abs(distDiff) > 120) return distDiff;
		const openScore = (value: boolean | null) => (value === true ? 0 : value === false ? 2 : 1);
		return openScore(a.isOpen) - openScore(b.isOpen);
	});
}

function balance(places: Place[], perCategory = MAX_PER_CATEGORY): Place[] {
	const buckets = Object.fromEntries(PLACE_CATEGORIES.map((category) => [category, [] as Place[]])) as Record<
		PlaceCategory,
		Place[]
	>;
	for (const place of places) {
		if (buckets[place.category].length < perCategory) buckets[place.category].push(place);
	}
	return PLACE_CATEGORIES.flatMap((category) => buckets[category]);
}

async function fetchBundle(
	fetchFn: typeof fetch,
	endpoint: string,
	query: string
): Promise<OverpassElement[]> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), OVERPASS_ABORT_MS);
	try {
		const response = await fetchFn(endpoint, {
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
				// Some Overpass mirrors reject default runtimes without a UA.
				'user-agent': 'ZuriCity/1.0 (https://github.com/danacr/Zuri-City)'
			},
			body: `data=${encodeURIComponent(query)}`,
			signal: controller.signal,
			cache: 'no-store'
		});
		if (!response.ok) throw new Error(`Overpass ${response.status}`);
		const payload = (await response.json()) as { elements?: OverpassElement[]; remark?: string };
		if (payload.remark && /timed out/i.test(payload.remark)) {
			throw new Error(payload.remark);
		}
		return payload.elements || [];
	} finally {
		clearTimeout(timer);
	}
}

async function fetchAllBundles(
	fetchFn: typeof fetch,
	endpoint: string
): Promise<OverpassElement[]> {
	const batches = await Promise.all(
		QUERY_BUNDLES.map((query) => fetchBundle(fetchFn, endpoint, query).catch(() => [] as OverpassElement[]))
	);
	return batches.flat();
}

export async function loadCityPlaces(fetchFn: typeof fetch): Promise<{
	places: Place[];
	source: 'overpass' | 'fallback';
	error: string;
}> {
	for (const endpoint of OVERPASS_ENDPOINTS) {
		try {
			const elements = await fetchAllBundles(fetchFn, endpoint);
			const mapped = elements.map(fromElement).filter((item): item is Place => item !== null);
			if (mapped.length < 80) throw new Error(`Sparse Overpass mapping (${mapped.length})`);
			const places = balance(rankNearbyOpen(dedupe([...mapped, ...FALLBACK_PLACES])));
			return { places, source: 'overpass', error: '' };
		} catch {
			/* Try next mirror, then curated fallback. */
		}
	}

	return {
		places: balance(rankNearbyOpen(FALLBACK_PLACES)),
		source: 'fallback',
		error: 'Live places timed out — showing curated Zürich highlights.'
	};
}


export type PlacesBbox = { west: number; south: number; east: number; north: number };

function bboxClause(bbox: PlacesBbox): string {
	return `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
}

function bboxQueryBundles(bbox: PlacesBbox): string[] {
	const b = bboxClause(bbox);
	return [
		`
[out:json][timeout:8];
(
  node["amenity"~"restaurant|fast_food|biergarten|food_court|cafe|ice_cream|bar|pub|nightclub"](${b});
  node["shop"~"bakery|pastry|coffee|chocolate|confectionery"](${b});
  way["amenity"~"restaurant|fast_food|cafe|bar|pub"](${b});
  way["shop"~"bakery|pastry|coffee"](${b});
);
out center 1400;
`.trim(),
		`
[out:json][timeout:8];
(
  node["shop"~"hairdresser|beauty|nails|massage|cosmetics|perfumery|tattoo|piercing|clothes|shoes|books|jewelry|gift|electronics|fashion_accessories|department_store|mall|bicycle|sports|florist|furniture|optician|mobile_phone|computer|toys|music|convenience|supermarket|chemist|kiosk|greengrocer|butcher|dairy"](${b});
  node["amenity"~"pharmacy|bank|atm|post_office|fuel|charging_station|bicycle_rental|car_sharing|toilets|drinking_water|marketplace|theatre|cinema|arts_centre|library|community_centre|place_of_worship|fountain|public_bath|beauty_salon"](${b});
  node["craft"="hairdresser"](${b});
  node["beauty"](${b});
);
out center 1600;
`.trim(),
		`
[out:json][timeout:8];
(
  node["tourism"~"attraction|museum|viewpoint|gallery|artwork|zoo|theme_park|hotel|hostel|apartment"](${b});
  node["historic"~"monument|castle|memorial|ruins|archaeological_site"](${b});
  node["leisure"~"park|garden|nature_reserve|swimming_area|marina|playground|sports_centre|fitness_centre|swimming_pool|sauna|beach_resort"](${b});
  way["leisure"~"park|garden|nature_reserve"](${b});
  way["tourism"~"attraction|museum"](${b});
);
out center 1200;
`.trim()
	];
}

/**
 * Progressive viewport load — denser POIs for the current map bbox.
 * Caps grow with zoom so walking the streets reveals shops next to you.
 */
export async function loadPlacesInBbox(
	fetchFn: typeof fetch,
	bbox: PlacesBbox,
	zoom = 15
): Promise<{ places: Place[]; source: 'overpass' | 'empty'; error: string }> {
	const perCategory = zoom >= 16 ? 220 : zoom >= 14.5 ? 160 : zoom >= 13 ? 100 : 48;
	const queries = bboxQueryBundles(bbox);
	for (const endpoint of OVERPASS_ENDPOINTS) {
		try {
			const batches = await Promise.all(
				queries.map((query) => fetchBundle(fetchFn, endpoint, query).catch(() => [] as OverpassElement[]))
			);
			const mapped = batches
				.flat()
				.map(fromElement)
				.filter((item): item is Place => item !== null);
			if (!mapped.length) continue;
			const origin: [number, number] = [
				(bbox.west + bbox.east) / 2,
				(bbox.south + bbox.north) / 2
			];
			return {
				places: balance(rankNearbyOpen(dedupe(mapped), origin), perCategory),
				source: 'overpass',
				error: ''
			};
		} catch {
			/* next mirror */
		}
	}
	return { places: [], source: 'empty', error: 'Viewport places unavailable' };
}
