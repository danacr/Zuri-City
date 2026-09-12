import { FALLBACK_PLACES, type Place, type PlaceCategory } from '$lib/city/places';

const OVERPASS = 'https://overpass-api.de/api/interpreter';
/** Rough central Zürich bbox: south,west,north,east */
const BBOX = '47.355,8.510,47.395,8.565';

type OverpassElement = {
	type: string;
	id: number;
	lat?: number;
	lon?: number;
	center?: { lat: number; lon: number };
	tags?: Record<string, string>;
};

function categorize(tags: Record<string, string>): PlaceCategory | null {
	const tourism = tags.tourism || '';
	const amenity = tags.amenity || '';
	const shop = tags.shop || '';
	if (
		['attraction', 'museum', 'viewpoint', 'gallery', 'zoo', 'theme_park'].includes(tourism) ||
		amenity === 'theatre' ||
		amenity === 'cinema' ||
		amenity === 'arts_centre'
	)
		return 'attraction';
	if (['restaurant', 'cafe', 'fast_food', 'bar', 'pub', 'biergarten', 'ice_cream'].includes(amenity))
		return 'restaurant';
	if (shop) return 'shop';
	return null;
}

function openHint(tags: Record<string, string>): string {
	if (tags.opening_hours) return tags.opening_hours;
	if (tags.fee === 'no') return 'Free entry when open';
	return 'Hours vary — check before you go';
}

function subtitle(tags: Record<string, string>, category: PlaceCategory): string {
	if (tags.description) return tags.description.slice(0, 120);
	if (category === 'restaurant') {
		const cuisine = tags.cuisine?.replaceAll(';', ', ') || tags.amenity || 'Dining';
		return cuisine.charAt(0).toUpperCase() + cuisine.slice(1);
	}
	if (category === 'shop') return (tags.shop || 'Shop').replaceAll('_', ' ');
	return tags.tourism?.replaceAll('_', ' ') || tags.amenity?.replaceAll('_', ' ') || 'Zürich place';
}

function fromElement(element: OverpassElement): Place | null {
	const tags = element.tags || {};
	const name = tags.name || tags['name:en'];
	if (!name) return null;
	const category = categorize(tags);
	if (!category) return null;
	const lat = element.lat ?? element.center?.lat;
	const lon = element.lon ?? element.center?.lon;
	if (lat == null || lon == null) return null;
	return {
		id: `osm-${element.type}-${element.id}`,
		name,
		category,
		lat,
		lon,
		subtitle: subtitle(tags, category),
		openHint: openHint(tags),
		tags: [category, tags.amenity, tags.shop, tags.tourism].filter(Boolean) as string[]
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

function balance(places: Place[], perCategory = 45): Place[] {
	const buckets: Record<PlaceCategory, Place[]> = {
		attraction: [],
		restaurant: [],
		shop: []
	};
	for (const place of places) buckets[place.category].push(place);
	return (['attraction', 'restaurant', 'shop'] as PlaceCategory[]).flatMap((category) =>
		buckets[category].slice(0, perCategory)
	);
}

export async function loadCityPlaces(fetchFn: typeof fetch): Promise<{
	places: Place[];
	source: 'overpass' | 'fallback';
	error: string;
}> {
	const query = `
[out:json][timeout:20];
(
  node["tourism"~"attraction|museum|viewpoint|gallery"](${BBOX});
  way["tourism"~"attraction|museum|viewpoint|gallery"](${BBOX});
  node["amenity"~"restaurant|cafe|bar|pub|biergarten"](${BBOX});
  node["shop"~"bakery|clothes|books|supermarket|department_store|mall|jewelry|gift|fashion_accessories|shoes|electronics|convenience"](${BBOX});
  node["tourism"="hotel"](${BBOX});
);
out center 180;
`.trim();

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 12000);
	try {
		const response = await fetchFn(OVERPASS, {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
			body: `data=${encodeURIComponent(query)}`,
			signal: controller.signal,
			cache: 'no-store'
		});
		if (!response.ok) throw new Error(`Overpass ${response.status}`);
		const payload = (await response.json()) as { elements?: OverpassElement[] };
		const mapped = (payload.elements || [])
			.map(fromElement)
			.filter((place): place is Place => place !== null);
		const places = balance(dedupe([...FALLBACK_PLACES, ...mapped]));
		if (places.length < 20) throw new Error('Sparse Overpass response');
		return { places, source: 'overpass', error: '' };
	} catch {
		return {
			places: FALLBACK_PLACES,
			source: 'fallback',
			error: 'Live city places timed out — showing curated Zürich highlights.'
		};
	} finally {
		clearTimeout(timer);
	}
}
