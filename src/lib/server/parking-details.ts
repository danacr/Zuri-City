import type { Parking } from '../parking';

export function parseCapacity(html: string): number | null {
	const text = html
		.replace(/<[^>]*>/g, ' ')
		.replace(/&(?:nbsp|#160);/g, ' ')
		.replace(/&auml;|&#228;/g, 'ä');
	const match = text.match(/(\d[\d\s'’]*)\s+Plätze/i);
	if (!match) return null;
	const capacity = Number(match[1].replace(/\D/g, ''));
	return capacity > 0 ? capacity : null;
}
export function parseCoordinates(html: string): [number, number] | null {
	const match = html.match(/var\s+str\s*=\s*['"]\s*([+-]?[\d.]+)\s*,\s*([+-]?[\d.]+)\s*['"]/);
	if (!match) return null;
	const lat = Number(match[1]),
		lon = Number(match[2]);
	return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
		? [lat, lon]
		: null;
}

/** Enrich every RSS garage, with bounded concurrency and no stored lookup or cache. */
export async function enrichParkings(
	parkings: Parking[],
	fetcher: typeof fetch,
	externalSignal?: AbortSignal
) {
	const controller = new AbortController();
	/** Caller may share a tighter deadline (page hydrate); otherwise ~5.5s standalone. */
	const timer = externalSignal ? null : setTimeout(() => controller.abort(), 5_500);
	const onAbort = () => controller.abort();
	if (externalSignal) {
		if (externalSignal.aborted) controller.abort();
		else externalSignal.addEventListener('abort', onAbort, { once: true });
	}
	async function getPage(url: string) {
		try {
			const response = await fetcher(url, { signal: controller.signal, cache: 'no-store' });
			if (!response.ok) return '';
			const charset =
				response.headers.get('content-type')?.match(/charset=([^;\s]+)/i)?.[1] || 'utf-8';
			return new TextDecoder(charset).decode(await response.arrayBuffer());
		} catch {
			return '';
		}
	}
	let next = 0;
	try {
		await Promise.all(
			Array.from({ length: Math.min(6, parkings.length) }, async () => {
				while (next < parkings.length && !controller.signal.aborted) {
					const parking = parkings[next++];
					// Only request metadata from the feed provider, never from arbitrary feed URLs.
					if (!parking.id || !parking.link) continue;
					const url = new URL(parking.link);
					if (url.hostname !== 'www.pls-zh.ch' || !url.pathname.startsWith('/parkhaus/')) continue;
					url.protocol = 'https:';
					url.port = '';
					const [detail, map] = await Promise.all([
						getPage(url.href),
						getPage(
							`https://www.pls-zh.ch/parkhaus/parkhausmap.jsp?pid=${encodeURIComponent(parking.id)}`
						)
					]);
					parking.capacity = parseCapacity(detail);
					parking.coordinates = parseCoordinates(map);
				}
			})
		);
	} finally {
		if (timer) clearTimeout(timer);
		externalSignal?.removeEventListener('abort', onAbort);
	}
	return parkings;
}
