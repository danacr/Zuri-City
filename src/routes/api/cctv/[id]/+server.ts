import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { CCTV_UPSTREAM } from '$lib/intel/cameras';

/** Proxy + validate live ASTRA stills (rejects non-JPEG / tiny placeholders). */
export const GET: RequestHandler = async ({ params, fetch, setHeaders, url }) => {
	const id = params.id?.toLowerCase();
	if (!id || !CCTV_UPSTREAM[id]) throw error(404, 'Unknown camera');

	const upstream = `${CCTV_UPSTREAM[id]}?t=${Date.now()}`;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 8000);
	try {
		const response = await fetch(upstream, {
			signal: controller.signal,
			headers: {
				accept: 'image/jpeg,image/*;q=0.8,*/*;q=0.5',
				'user-agent': 'ZuriCityIntel/1.0 (live CCTV validation)'
			}
		});
		if (!response.ok) throw error(502, `Upstream camera ${response.status}`);
		const bytes = new Uint8Array(await response.arrayBuffer());
		if (bytes.byteLength < 8000 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
			throw error(502, 'Upstream camera returned a non-JPEG or empty frame');
		}
		setHeaders({
			'content-type': 'image/jpeg',
			'cache-control': 'no-store, max-age=0',
			'x-cctv-bytes': String(bytes.byteLength),
			'x-cctv-source': 'astramobcam'
		});
		if (url.searchParams.has('t')) {
			setHeaders({ 'x-cctv-bust': url.searchParams.get('t') || '' });
		}
		return new Response(bytes, { status: 200 });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		throw error(504, 'Camera feed timed out');
	} finally {
		clearTimeout(timer);
	}
};
