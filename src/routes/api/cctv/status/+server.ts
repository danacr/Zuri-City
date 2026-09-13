import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { CCTV_UPSTREAM } from '$lib/intel/cameras';

/** Validate every configured ASTRA still; used in QA and health checks. */
export const GET: RequestHandler = async ({ fetch, setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store' });
	const results = await Promise.all(
		Object.entries(CCTV_UPSTREAM).map(async ([id, upstream]) => {
			const started = Date.now();
			try {
				const response = await fetch(`${upstream}?t=${Date.now()}`, {
					headers: { accept: 'image/jpeg', 'user-agent': 'ZuriCityIntel/1.0' }
				});
				const bytes = new Uint8Array(await response.arrayBuffer());
				const jpeg = bytes.byteLength > 8000 && bytes[0] === 0xff && bytes[1] === 0xd8;
				return {
					id,
					ok: response.ok && jpeg,
					status: response.status,
					bytes: bytes.byteLength,
					ms: Date.now() - started,
					proxy: `/api/cctv/${id}`
				};
			} catch (err) {
				return {
					id,
					ok: false,
					status: 0,
					bytes: 0,
					ms: Date.now() - started,
					error: err instanceof Error ? err.message : 'fetch failed',
					proxy: `/api/cctv/${id}`
				};
			}
		})
	);
	return json({
		checkedAt: new Date().toISOString(),
		live: results.filter((item) => item.ok).length,
		total: results.length,
		results
	});
};
