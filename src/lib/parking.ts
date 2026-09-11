import coordinates from './parking-coordinates.json';

export type Parking = {
	id: string;
	name: string;
	status: string;
	free: number | null;
	coordinates: [number, number] | null;
	directions: string;
	link: string;
};

export function parseParking(item: { title?: string; content?: string; link?: string }): Parking {
	const title = item.title || 'Parking';
	const [state, count] = (item.content || '').split('/');
	const status = state.trim().toLowerCase();
	const free = /^\d+$/.test(count?.trim() || '') ? Number(count.trim()) : null;
	let id = '';
	let link = '';
	try {
		const url = new URL(item.link || '');
		if (url.protocol === 'https:' || url.protocol === 'http:') link = url.href;
		id = url.searchParams.get('pid') || '';
	} catch {
		/* Missing provider link. */
	}
	const point = (coordinates as Record<string, number[]>)[id];
	return {
		id,
		name: title.split('/')[0].trim(),
		status,
		free,
		coordinates: point ? [point[0], point[1]] : null,
		directions:
			'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=' +
			encodeURIComponent(title.replace('/', ',') + ', Zürich'),
		link
	};
}

export function availability(parking: Parking) {
	if (parking.status === 'closed') return 'Closed';
	if (parking.status === 'full' || parking.free === 0) return 'Full';
	if (parking.status === 'open' && parking.free !== null) return `${parking.free} free`;
	return 'Unknown';
}

export function distance(from: [number, number], to: [number, number]) {
	const rad = Math.PI / 180;
	const a =
		Math.sin(((to[0] - from[0]) * rad) / 2) ** 2 +
		Math.cos(from[0] * rad) * Math.cos(to[0] * rad) * Math.sin(((to[1] - from[1]) * rad) / 2) ** 2;
	return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
