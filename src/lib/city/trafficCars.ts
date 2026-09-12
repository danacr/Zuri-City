import type { Feature, FeatureCollection, Position } from 'geojson';

export type Congestion = 'free' | 'slow' | 'jam';

/** A short glowing streak that slides along a road centerline. */
export type TrafficTracer = {
	id: string;
	line: Position[];
	distanceM: number;
	progressM: number;
	speedMps: number;
	lengthM: number;
	congestion: Congestion;
	color: string;
};

const ROAD_CLASSES = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary']);

/** Matches street traffic-flow colors. */
export const CONGESTION_COLOR: Record<Congestion, string> = {
	free: '#3dd68c',
	slow: '#ffb020',
	jam: '#ff5c5c'
};

const SPEED_MPS: Record<Congestion, [number, number]> = {
	free: [14, 22],
	slow: [5, 9],
	jam: [1.2, 2.8]
};

/** Streak length along the road (meters). */
const STREAK_M: Record<Congestion, number> = {
	free: 48,
	slow: 36,
	jam: 28
};

/** Spacing between tracers on one segment. */
const SPACING_M: Record<Congestion, number> = {
	free: 160,
	slow: 110,
	jam: 75
};

const MAX_PER_ROAD: Record<Congestion, number> = {
	free: 2,
	slow: 3,
	jam: 4
};

type RoadSegment = {
	key: string;
	line: Position[];
	distanceM: number;
	congestion: Congestion;
	color: string;
	roadIndex: number;
};

export function congestionForRoad(props: Record<string, unknown>, featureId: unknown): Congestion {
	const roadClass = String(props.class ?? '');
	const ref = String(props.ref ?? '');
	const name = String(props.name ?? '');
	const idNum = typeof featureId === 'number' ? featureId : Number(featureId) || 0;
	const classSalt =
		roadClass === 'motorway'
			? 0
			: roadClass === 'trunk'
				? 1
				: roadClass === 'primary'
					? 2
					: roadClass === 'secondary'
						? 3
						: 1;
	const bucket = (idNum + classSalt + ref.length + name.length) % 3;
	return bucket === 0 ? 'free' : bucket === 1 ? 'slow' : 'jam';
}

function haversineM(a: Position, b: Position): number {
	const toRad = Math.PI / 180;
	const dLat = (b[1] - a[1]) * toRad;
	const dLon = (b[0] - a[0]) * toRad;
	const lat1 = a[1] * toRad;
	const lat2 = b[1] * toRad;
	const h =
		Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
	return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function lineLengthM(line: Position[]): number {
	let total = 0;
	for (let i = 1; i < line.length; i++) total += haversineM(line[i - 1], line[i]);
	return total;
}

export function pointAlongLine(
	line: Position[],
	distanceM: number
): { position: Position; bearing: number } {
	if (line.length < 2) return { position: line[0] ?? [0, 0], bearing: 0 };
	let remaining = Math.max(0, distanceM);
	for (let i = 1; i < line.length; i++) {
		const a = line[i - 1];
		const b = line[i];
		const seg = haversineM(a, b);
		if (seg <= 0) continue;
		if (remaining <= seg) {
			const t = remaining / seg;
			return {
				position: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
				bearing: bearingDeg(a, b)
			};
		}
		remaining -= seg;
	}
	const a = line[line.length - 2];
	const b = line[line.length - 1];
	return { position: b, bearing: bearingDeg(a, b) };
}

/** Sample a short polyline along `line` centered on progressM. */
export function streakAlongLine(
	line: Position[],
	progressM: number,
	lengthM: number,
	samples = 6
): Position[] {
	const total = lineLengthM(line);
	const half = lengthM / 2;
	const start = Math.max(0, progressM - half);
	const end = Math.min(total, progressM + half);
	if (end <= start + 1) {
		const { position } = pointAlongLine(line, progressM);
		return [position, position];
	}
	const coords: Position[] = [];
	for (let i = 0; i <= samples; i++) {
		const d = start + ((end - start) * i) / samples;
		coords.push(pointAlongLine(line, d).position);
	}
	return coords;
}

function bearingDeg(a: Position, b: Position): number {
	const toRad = Math.PI / 180;
	const φ1 = a[1] * toRad;
	const φ2 = b[1] * toRad;
	const Δλ = (b[0] - a[0]) * toRad;
	const y = Math.sin(Δλ) * Math.cos(φ2);
	const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
	return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function asLineCoords(geometry: Feature['geometry'] | null | undefined): Position[][] {
	if (!geometry) return [];
	if (geometry.type === 'LineString') return [geometry.coordinates];
	if (geometry.type === 'MultiLineString') return geometry.coordinates;
	return [];
}

function rand(seed: number): number {
	const x = Math.sin(seed * 12.9898) * 43758.5453;
	return x - Math.floor(x);
}

function pickSpeed(congestion: Congestion, seed: number): number {
	const [lo, hi] = SPEED_MPS[congestion];
	return lo + (hi - lo) * rand(seed);
}

function segmentKey(line: Position[]): string {
	const a = line[0];
	const b = line[line.length - 1];
	const mid = line[Math.floor(line.length / 2)] ?? a;
	const q = (n: number) => n.toFixed(5);
	return `${q(a[0])},${q(a[1])}|${q(mid[0])},${q(mid[1])}|${q(b[0])},${q(b[1])}`;
}

function collectSegments(features: Feature[]): RoadSegment[] {
	const seen = new Set<string>();
	const segments: RoadSegment[] = [];
	let roadIndex = 0;

	for (const feature of features) {
		const props = (feature.properties ?? {}) as Record<string, unknown>;
		const roadClass = String(props.class ?? '');
		if (!ROAD_CLASSES.has(roadClass)) continue;
		if (props.brunnel === 'tunnel') continue;

		const congestion = congestionForRoad(props, feature.id);
		const color = CONGESTION_COLOR[congestion];

		for (const line of asLineCoords(feature.geometry)) {
			if (line.length < 2) continue;
			const distanceM = lineLengthM(line);
			if (distanceM < 40) continue;
			const key = segmentKey(line);
			if (seen.has(key)) continue;
			seen.add(key);
			segments.push({ key, line, distanceM, congestion, color, roadIndex });
			roadIndex++;
		}
	}

	return segments;
}

/** Stable spatial sort so the budget spreads across the viewport. */
function spreadSegments(segments: RoadSegment[]): RoadSegment[] {
	return [...segments].sort((a, b) => {
		const aLon = a.line[0]?.[0] ?? 0;
		const aLat = a.line[0]?.[1] ?? 0;
		const bLon = b.line[0]?.[0] ?? 0;
		const bLat = b.line[0]?.[1] ?? 0;
		const aCell = Math.floor(aLon * 200) * 10007 + Math.floor(aLat * 200);
		const bCell = Math.floor(bLon * 200) * 10007 + Math.floor(bLat * 200);
		if (aCell !== bCell) return aCell - bCell;
		return b.distanceM - a.distanceM;
	});
}

function makeTracer(segment: RoadSegment, slot: number, slots: number): TrafficTracer {
	const seed = segment.roadIndex * 97 + slot * 13 + segment.distanceM;
	const progressM =
		(segment.distanceM * ((slot + rand(seed)) / Math.max(1, slots))) % segment.distanceM;
	return {
		id: `trace-${segment.roadIndex}-${slot}-${Math.floor(seed)}`,
		line: segment.line,
		distanceM: segment.distanceM,
		progressM,
		speedMps: pickSpeed(segment.congestion, seed + 3),
		lengthM: STREAK_M[segment.congestion],
		congestion: segment.congestion,
		color: segment.color
	};
}

/**
 * Build moving traffic streaks from vector-tile road features.
 * Two-pass: one streak per road first (coverage), then densify by spacing.
 */
export function spawnTracersFromRoadFeatures(
	features: Feature[],
	options: { maxTracers?: number } = {}
): TrafficTracer[] {
	const maxTracers = options.maxTracers ?? 160;
	const segments = spreadSegments(collectSegments(features));
	if (segments.length === 0 || maxTracers <= 0) return [];

	const tracers: TrafficTracer[] = [];
	const placed = new Map<string, number>();

	for (const segment of segments) {
		if (tracers.length >= maxTracers) break;
		tracers.push(makeTracer(segment, 0, 1));
		placed.set(segment.key, 1);
	}

	for (const segment of segments) {
		if (tracers.length >= maxTracers) break;
		const already = placed.get(segment.key) ?? 0;
		const target = Math.max(
			1,
			Math.min(
				MAX_PER_ROAD[segment.congestion],
				Math.floor(segment.distanceM / SPACING_M[segment.congestion])
			)
		);
		for (let slot = already; slot < target; slot++) {
			if (tracers.length >= maxTracers) break;
			tracers.push(makeTracer(segment, slot, target));
			placed.set(segment.key, slot + 1);
		}
	}

	return tracers;
}

export function advanceTracers(tracers: TrafficTracer[], dtSec: number): TrafficTracer[] {
	return tracers.map((tracer) => {
		let progressM = tracer.progressM + tracer.speedMps * dtSec;
		if (progressM > tracer.distanceM) progressM = progressM % tracer.distanceM;
		return { ...tracer, progressM };
	});
}

/** Short LineStrings sliding along roads — no icons / models. */
export function tracersToGeoJSON(tracers: TrafficTracer[]): FeatureCollection {
	return {
		type: 'FeatureCollection',
		features: tracers.map((tracer) => ({
			type: 'Feature' as const,
			id: tracer.id,
			properties: {
				id: tracer.id,
				color: tracer.color,
				congestion: tracer.congestion
			},
			geometry: {
				type: 'LineString' as const,
				coordinates: streakAlongLine(tracer.line, tracer.progressM, tracer.lengthM)
			}
		}))
	};
}

export function isRoadFeature(feature: Feature): boolean {
	const props = feature.properties ?? {};
	return ROAD_CLASSES.has(String(props.class ?? '')) && props.brunnel !== 'tunnel';
}

/** Back-compat aliases while ZurichCity migrates to tracer names. */
export type SimCar = TrafficTracer;
export const spawnCarsFromRoadFeatures = (
	features: Feature[],
	options: { maxCars?: number; maxTracers?: number } = {}
) => spawnTracersFromRoadFeatures(features, { maxTracers: options.maxTracers ?? options.maxCars });
export const advanceCars = advanceTracers;
export const carsToGeoJSON = tracersToGeoJSON;
