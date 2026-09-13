import { CATEGORY_SORT_KEY, type Place } from './types';

export function placeToFeature(placeItem: Place) {
	return {
		type: 'Feature' as const,
		id: placeItem.id,
		properties: {
			id: placeItem.id,
			name: placeItem.name,
			category: placeItem.category,
			icon: `place-${placeItem.category}`,
			subtitle: placeItem.subtitle,
			openHint: placeItem.openHint,
			isOpen: placeItem.isOpen === null ? 'unknown' : placeItem.isOpen ? 'yes' : 'no',
			sortKey: CATEGORY_SORT_KEY[placeItem.category] ?? 50
		},
		geometry: {
			type: 'Point' as const,
			coordinates: [placeItem.lon, placeItem.lat]
		}
	};
}

export function placesToGeoJSON(places: Place[]) {
	return {
		type: 'FeatureCollection' as const,
		features: places.map(placeToFeature)
	};
}

export function haversineMeters(a: [number, number], b: [number, number]): number {
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const [lon1, lat1] = a;
	const [lon2, lat2] = b;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const aa =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
	return 2 * 6371000 * Math.asin(Math.sqrt(aa));
}
