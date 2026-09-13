/**
 * Live Zürich road disruptions — no API key.
 *
 * Sources (both public / keyless):
 * 1. Kanton Zürich Baustellen WFS (maps.zh.ch) — official roadworks polygons
 * 2. OpenStreetMap Overpass — highway=construction ways with live geometry
 *
 * Replaces ASTRA DATEX counters (required a free but mandatory API key).
 * Severity maps onto free / slow / jam for the existing traffic overlay.
 *
 * Keep feeds under a hard time budget — with `ssr = false`, hydrateCity awaits
 * intel before the map shell mounts, so a hung Overpass mirror must not block boot.
 */
import type { TrafficSegment } from '$lib/intel/types';

const KTZH_WFS =
	'https://maps.zh.ch/wfs/TbaBaustellenZHWFS?SERVICE=WFS&VERSION=1.1.0&REQUEST=GetFeature&TYPENAME=baustellen-detailansicht&SRSNAME=EPSG:4326&OUTPUTFORMAT=geojson';

const OVERPASS_MIRRORS = [
	'https://overpass-api.de/api/interpreter',
	'https://overpass.kumi.systems/api/interpreter',
	'https://overpass.openstreetmap.fr/api/interpreter'
];

/** Greater Zürich bowl — drop cantonal sites outside the city map. */
const ZH_BBOX = { west: 8.35, south: 47.28, east: 8.72, north: 47.48 };

/**
 * Hard ceiling so hydrateCity /api/intel cannot stall on a slow mirror.
 * Vercel functions die ~10s — KTZH alone answers in ~1–2s; Overpass is optional.
 */
const FEED_BUDGET_MS = 3_500;
const OVERPASS_BUDGET_MS = 2_500;

type CacheBox<T> = { at: number; value: T };
let cache: CacheBox<TrafficSegment[]> | null = null;

/** Test-only — clears the disruption cache between Vitest cases. */
export function resetSwissTrafficCacheForTests() {
	cache = null;
}

type GjGeometry =
	| { type: 'Point'; coordinates: [number, number] }
	| { type: 'LineString'; coordinates: [number, number][] }
	| { type: 'MultiLineString'; coordinates: [number, number][][] }
	| { type: 'Polygon'; coordinates: [number, number][][] }
	| { type: 'MultiPolygon'; coordinates: [number, number][][][] };

type GjFeature = {
	id?: string | number;
	properties?: Record<string, unknown> | null;
	geometry?: GjGeometry | null;
};

function inBbox(lon: number, lat: number): boolean {
	return (
		lon >= ZH_BBOX.west &&
		lon <= ZH_BBOX.east &&
		lat >= ZH_BBOX.south &&
		lat <= ZH_BBOX.north
	);
}

function ringToLine(ring: [number, number][]): [number, number][] {
	const cleaned = ring.filter(
		(c) => Number.isFinite(c[0]) && Number.isFinite(c[1]) && inBbox(c[0], c[1])
	);
	if (cleaned.length >= 2) return cleaned;
	return [];
}

function geometryToLines(geometry: GjGeometry): [number, number][][] {
	switch (geometry.type) {
		case 'LineString':
			return [ringToLine(geometry.coordinates)].filter((l) => l.length >= 2);
		case 'MultiLineString':
			return geometry.coordinates.map(ringToLine).filter((l) => l.length >= 2);
		case 'Polygon':
			return geometry.coordinates[0]
				? [ringToLine(geometry.coordinates[0])].filter((l) => l.length >= 2)
				: [];
		case 'MultiPolygon':
			return geometry.coordinates
				.map((poly) => (poly[0] ? ringToLine(poly[0]) : []))
				.filter((l) => l.length >= 2);
		case 'Point': {
			const [lon, lat] = geometry.coordinates;
			if (!inBbox(lon, lat)) return [];
			// ~25 m east–west stub — long diagonals were painting across the Limmat.
			const dLon = 0.00018;
			return [
				[
					[lon - dLon, lat],
					[lon + dLon, lat]
				]
			];
		}
		default:
			return [];
	}
}

function levelFromText(...parts: Array<string | null | undefined>): TrafficSegment['level'] {
	const text = parts.filter(Boolean).join(' ').toLowerCase();
	if (
		/vollsperr|totalsperr|gesperrt|sperrung|closed|no_?entry|motor_vehicle['"]?\s*=\s*['"]?no/.test(
			text
		)
	) {
		return 'jam';
	}
	if (/einspur|ampel|umleitung|verengt|baustelle|construction|restriction|lane/.test(text)) {
		return 'slow';
	}
	// Active roadworks default to restricted, never "free".
	return 'slow';
}

function parseKtzh(geojson: { features?: GjFeature[] }): TrafficSegment[] {
	const out: TrafficSegment[] = [];
	for (const feature of geojson.features || []) {
		if (!feature.geometry) continue;
		const props = feature.properties || {};
		const name =
			String(props.strassenname || props.strassenbez || props.gemeindename || 'Baustelle').trim() ||
			'Baustelle';
		const level = levelFromText(
			String(props.verkehrsfuehrung || ''),
			String(props.beschreibung || ''),
			String(props.status_baustelle || '')
		);
		const lines = geometryToLines(feature.geometry);
		lines.forEach((coordinates, index) => {
			out.push({
				id: `ktzh-${feature.id ?? name}-${index}`,
				name,
				coordinates,
				level,
				modeled: false
			});
		});
	}
	return out;
}

function parseOverpass(payload: {
	elements?: Array<{
		type: string;
		id: number;
		geometry?: Array<{ lat: number; lon: number }>;
		tags?: Record<string, string>;
	}>;
}): TrafficSegment[] {
	const out: TrafficSegment[] = [];
	for (const el of payload.elements || []) {
		if (el.type !== 'way' || !el.geometry || el.geometry.length < 2) continue;
		const coordinates = el.geometry
			.map((p) => [p.lon, p.lat] as [number, number])
			.filter(([lon, lat]) => inBbox(lon, lat));
		if (coordinates.length < 2) continue;
		const tags = el.tags || {};
		const name = (tags.name || tags.ref || 'Construction').trim();
		const level = levelFromText(
			tags.highway,
			tags.construction,
			tags.motor_vehicle,
			tags.access,
			tags.note,
			tags.description
		);
		out.push({
			id: `osm-${el.id}`,
			name,
			coordinates,
			level,
			modeled: false
		});
	}
	return out;
}

function abortedFetch(
	fetchFn: typeof fetch,
	input: RequestInfo | URL,
	init: RequestInit | undefined,
	ms: number,
	label: string
): Promise<Response> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), ms);
	return fetchFn(input, { ...init, signal: controller.signal })
		.finally(() => clearTimeout(timer))
		.catch((error) => {
			if (controller.signal.aborted) throw new Error(`${label} timed out`);
			throw error;
		});
}

async function fetchKtzh(fetchFn: typeof fetch): Promise<TrafficSegment[]> {
	const response = await abortedFetch(
		fetchFn,
		KTZH_WFS,
		{
			headers: { accept: 'application/json', 'user-agent': 'ZuriCity/1.0 (https://zuri.city)' },
			cache: 'no-store'
		},
		FEED_BUDGET_MS,
		'KTZH Baustellen'
	);
	if (!response.ok) throw new Error(`KTZH Baustellen HTTP ${response.status}`);
	const json = (await response.json()) as { features?: GjFeature[] };
	return parseKtzh(json);
}

async function fetchOverpassMirror(
	fetchFn: typeof fetch,
	url: string,
	query: string
): Promise<TrafficSegment[]> {
	const response = await abortedFetch(
		fetchFn,
		url,
		{
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
				'user-agent': 'ZuriCity/1.0 (https://zuri.city)'
			},
			body: `data=${encodeURIComponent(query)}`,
			cache: 'no-store'
		},
		OVERPASS_BUDGET_MS,
		'Overpass'
	);
	if (!response.ok) throw new Error(`Overpass HTTP ${response.status}`);
	return parseOverpass((await response.json()) as Parameters<typeof parseOverpass>[0]);
}

async function fetchOverpass(fetchFn: typeof fetch): Promise<TrafficSegment[]> {
	const query = `
[out:json][timeout:2];
(
  way["highway"="construction"](${ZH_BBOX.south},${ZH_BBOX.west},${ZH_BBOX.north},${ZH_BBOX.east});
  way["highway"]["construction"](${ZH_BBOX.south},${ZH_BBOX.west},${ZH_BBOX.north},${ZH_BBOX.east});
);
out geom;`.trim();

	// Race mirrors — first success wins; don't walk them sequentially.
	const raced = OVERPASS_MIRRORS.map((url) => fetchOverpassMirror(fetchFn, url, query));
	return await Promise.any(raced);
}

function dedupe(segments: TrafficSegment[]): TrafficSegment[] {
	const seen = new Set<string>();
	const out: TrafficSegment[] = [];
	for (const segment of segments) {
		const key = `${segment.name.toLowerCase()}|${segment.coordinates[0]?.[0]?.toFixed(4)}|${segment.coordinates[0]?.[1]?.toFixed(4)}|${segment.level}`;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(segment);
	}
	return out;
}

export async function loadSwissTraffic(fetchFn: typeof fetch): Promise<{
	traffic: TrafficSegment[];
	source: 'zh-roadworks' | 'unavailable';
	error: string;
}> {
	const now = Date.now();
	if (cache && now - cache.at < 90_000) {
		return { traffic: cache.value, source: 'zh-roadworks', error: '' };
	}

	// Prefer KTZH (fast, official). Overpass is a bonus — never block on it.
	const ktzhPromise = fetchKtzh(fetchFn);
	const overpassPromise = fetchOverpass(fetchFn).catch(() => [] as TrafficSegment[]);
	const chunks: TrafficSegment[] = [];
	const errors: string[] = [];

	try {
		chunks.push(...(await ktzhPromise));
	} catch (error) {
		errors.push(error instanceof Error ? error.message : 'KTZH failed');
	}
	try {
		chunks.push(...(await overpassPromise));
	} catch (error) {
		errors.push(error instanceof Error ? error.message : 'Overpass failed');
	}

	const traffic = dedupe(chunks);
	if (!traffic.length) {
		return {
			traffic: cache?.value || [],
			source: 'unavailable',
			error: errors[0] || 'No live roadworks inside the Zürich bowl.'
		};
	}

	cache = { at: now, value: traffic };
	return { traffic, source: 'zh-roadworks', error: '' };
}
