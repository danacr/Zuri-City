export type Parking = {
	id: string;
	name: string;
	address: string;
	status: string;
	free: number | null;
	capacity: number | null;
	coordinates: [number, number] | null;
	directions: string;
	link: string;
	updated: string | null;
};
export function parseParking(item: {
	title?: string;
	content?: string;
	link?: string;
	isoDate?: string;
}): Parking {
	const title = item.title || 'Parking';
	const [state, count] = (item.content || '').split('/');
	const status = state.trim().toLowerCase();
	const free = /^\d+$/.test(count?.trim() || '') ? Number(count.trim()) : null;
	let id = '',
		link = '';
	try {
		const url = new URL(item.link || '');
		if (url.protocol === 'https:' || url.protocol === 'http:') link = url.href;
		id = url.searchParams.get('pid') || '';
	} catch {
		/* Missing provider link. */
	}
	return {
		id,
		name: title.split('/')[0].trim(),
		address: title.split('/').slice(1).join('/').trim(),
		status,
		free,
		capacity: null,
		coordinates: null,
		updated: item.isoDate || null,
		directions:
			'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=' +
			encodeURIComponent(title.replace('/', ',') + ', Zürich'),
		link
	};
}
export function availability(parking: Parking) {
	if (parking.status === 'closed') return 'Closed';
	if (parking.status === 'full') return 'Full';
	if (parking.status !== 'open') return 'Unknown';
	if (parking.free === 0) return 'Full';
	return parking.free === null ? 'Unknown' : 'Open';
}
export function parkingTone(parking: Parking) {
	const state = availability(parking);
	return state === 'Closed' || state === 'Full' ? 'red' : state === 'Open' ? 'green' : 'grey';
}
export function spotCount(parking: Parking) {
	return `${parking.free ?? '—'} / ${parking.capacity ?? '—'}`;
}
export function distance(from: [number, number], to: [number, number]) {
	const rad = Math.PI / 180;
	const a =
		Math.sin(((to[0] - from[0]) * rad) / 2) ** 2 +
		Math.cos(from[0] * rad) * Math.cos(to[0] * rad) * Math.sin(((to[1] - from[1]) * rad) / 2) ** 2;
	return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

export function parkingIssues(parking: Parking): string[] {
	const issues: string[] = [];
	if (parking.status === 'closed') issues.push('The provider reports this garage is closed.');
	else if (availability(parking) === 'Full')
		issues.push('The provider reports no available parking spaces.');
	else if (availability(parking) === 'Unknown')
		issues.push(
			parking.status && parking.status !== 'open'
				? `Unrecognized provider status: ${parking.status}.`
				: 'Availability could not be confirmed.'
		);
	if (parking.free === null) issues.push('Free-space count was not supplied.');
	if (parking.capacity === null) issues.push('Total capacity could not be retrieved.');
	if (!parking.coordinates)
		issues.push('Coordinates could not be retrieved; not shown on the map.');
	if (!parking.address) issues.push('Street address was not supplied.');
	if (!parking.link) issues.push('Garage details link was not supplied.');
	return issues;
}
