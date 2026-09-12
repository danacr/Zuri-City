import type { Feature, FeatureCollection, Position } from 'geojson';

export type Congestion = 'free' | 'slow' | 'jam';

export type SimCar = {
	id: string;
	line: Position[];
	distanceM: number;
	progressM: number;
	speedMps: number;
	congestion: Congestion;
	bearing: number;
	color: string;
};

const ROAD_CLASSES = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary']);

/** Matches street traffic-flow colors. */
export const CONGESTION_COLOR: Record<Congestion, string> = {
	free: '#2f9e44',
	slow: '#f08c00',
	jam: '#e03131'
};

export const CAR_ICON_IDS: Record<Congestion, string> = {
	free: 'traffic-car-free',
	slow: 'traffic-car-slow',
	jam: 'traffic-car-jam'
};

const SPEED_MPS: Record<Congestion, [number, number]> = {
	free: [12, 17],
	slow: [3.5, 6.5],
	jam: [0.55, 1.6]
};

/**
 * Spacing along a road. Kept generous so the fleet spreads across many
 * corridors instead of stacking on a few jam segments.
 */
const SPACING_M: Record<Congestion, number> = {
	free: 180,
	slow: 110,
	jam: 70
};

/** Cap per segment — jam roads must not monopolize the global budget. */
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

/** Stable spatial sort so the budget spreads across the viewport, not tile order. */
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

function makeCar(segment: RoadSegment, slot: number, slots: number): SimCar {
	const seed = segment.roadIndex * 97 + slot * 13 + segment.distanceM;
	const progressM =
		(segment.distanceM * ((slot + rand(seed)) / Math.max(1, slots))) % segment.distanceM;
	const { bearing } = pointAlongLine(segment.line, progressM);
	return {
		id: `car-${segment.roadIndex}-${slot}-${Math.floor(seed)}`,
		line: segment.line,
		distanceM: segment.distanceM,
		progressM,
		speedMps: pickSpeed(segment.congestion, seed + 3),
		congestion: segment.congestion,
		bearing,
		color: segment.color
	};
}

/**
 * Build a car fleet from vector-tile road features currently loaded.
 * Two-pass: one car per road first (coverage), then fill remaining slots by spacing.
 */
export function spawnCarsFromRoadFeatures(
	features: Feature[],
	options: { maxCars?: number } = {}
): SimCar[] {
	const maxCars = options.maxCars ?? 110;
	const segments = spreadSegments(collectSegments(features));
	if (segments.length === 0 || maxCars <= 0) return [];

	const cars: SimCar[] = [];
	const placed = new Map<string, number>();

	// Pass 1 — cover as many distinct roads as possible.
	for (const segment of segments) {
		if (cars.length >= maxCars) break;
		cars.push(makeCar(segment, 0, 1));
		placed.set(segment.key, 1);
	}

	// Pass 2 — densify longer / jammer roads without starving coverage.
	for (const segment of segments) {
		if (cars.length >= maxCars) break;
		const already = placed.get(segment.key) ?? 0;
		const target = Math.max(
			1,
			Math.min(
				MAX_PER_ROAD[segment.congestion],
				Math.floor(segment.distanceM / SPACING_M[segment.congestion])
			)
		);
		for (let slot = already; slot < target; slot++) {
			if (cars.length >= maxCars) break;
			cars.push(makeCar(segment, slot, target));
			placed.set(segment.key, slot + 1);
		}
	}

	return cars;
}

export function advanceCars(cars: SimCar[], dtSec: number): SimCar[] {
	return cars.map((car) => {
		let progressM = car.progressM + car.speedMps * dtSec;
		if (progressM > car.distanceM) progressM = progressM % car.distanceM;
		const { bearing } = pointAlongLine(car.line, progressM);
		return { ...car, progressM, bearing };
	});
}

export function carsToGeoJSON(cars: SimCar[]): FeatureCollection {
	return {
		type: 'FeatureCollection',
		features: cars.map((car) => {
			const { position, bearing } = pointAlongLine(car.line, car.progressM);
			return {
				type: 'Feature',
				id: car.id,
				properties: {
					id: car.id,
					bearing,
					color: car.color,
					congestion: car.congestion,
					icon: CAR_ICON_IDS[car.congestion]
				},
				geometry: {
					type: 'Point',
					coordinates: position
				}
			};
		})
	};
}

function shade(hex: string, amount: number): string {
	const n = hex.replace('#', '');
	const num = parseInt(n.length === 3 ? n.split('').map((c) => c + c).join('') : n, 16);
	const r = Math.min(255, Math.max(0, ((num >> 16) & 255) + amount));
	const g = Math.min(255, Math.max(0, ((num >> 8) & 255) + amount));
	const b = Math.min(255, Math.max(0, (num & 255) + amount));
	return `rgb(${r},${g},${b})`;
}

/** Top-down car (nose up), colored by congestion. */
export function drawCarIcon(congestion: Congestion = 'free', pixelSize = 128): ImageData | null {
	const canvas = document.createElement('canvas');
	canvas.width = pixelSize;
	canvas.height = pixelSize;
	const ctx = canvas.getContext('2d');
	if (!ctx) return null;
	const u = pixelSize / 64;
	const body = CONGESTION_COLOR[congestion];
	const roof = shade(body, 42);
	const side = shade(body, -38);
	ctx.clearRect(0, 0, pixelSize, pixelSize);
	ctx.translate(pixelSize / 2, pixelSize / 2);

	ctx.fillStyle = 'rgba(10, 14, 20, 0.28)';
	ctx.beginPath();
	ctx.ellipse(1.5 * u, 2 * u, 11 * u, 16 * u, 0, 0, Math.PI * 2);
	ctx.fill();

	ctx.fillStyle = side;
	roundRect(ctx, -6 * u, -15 * u, 14 * u, 30 * u, 3.2 * u);
	ctx.fill();

	ctx.fillStyle = body;
	ctx.strokeStyle = '#12161d';
	ctx.lineWidth = 1.4 * u;
	roundRect(ctx, -8 * u, -16 * u, 14 * u, 30 * u, 3.5 * u);
	ctx.fill();
	ctx.stroke();

	ctx.fillStyle = roof;
	roundRect(ctx, -5.5 * u, -5 * u, 10 * u, 11 * u, 2.2 * u);
	ctx.fill();
	ctx.stroke();

	ctx.fillStyle = 'rgba(210, 230, 245, 0.75)';
	roundRect(ctx, -4.5 * u, -13.5 * u, 8 * u, 5 * u, 1.6 * u);
	ctx.fill();
	ctx.fillStyle = 'rgba(170, 195, 215, 0.55)';
	roundRect(ctx, -4.5 * u, 6.5 * u, 8 * u, 4 * u, 1.4 * u);
	ctx.fill();

	ctx.fillStyle = 'rgba(255,255,255,0.28)';
	roundRect(ctx, -7 * u, -15 * u, 3.2 * u, 28 * u, 1.5 * u);
	ctx.fill();

	ctx.fillStyle = '#1a1f28';
	for (const [x, y] of [
		[-9.2, -8],
		[7.2, -8],
		[-9.2, 7],
		[7.2, 7]
	] as const) {
		roundRect(ctx, x * u, y * u, 2.6 * u, 7 * u, 1 * u);
		ctx.fill();
	}

	ctx.fillStyle = '#fff6c8';
	ctx.beginPath();
	ctx.arc(-3.2 * u, -15.2 * u, 1.3 * u, 0, Math.PI * 2);
	ctx.arc(1.6 * u, -15.2 * u, 1.3 * u, 0, Math.PI * 2);
	ctx.fill();

	return ctx.getImageData(0, 0, pixelSize, pixelSize);
}

function roundRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number
) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
}

export function isRoadFeature(feature: Feature): boolean {
	const props = feature.properties ?? {};
	return ROAD_CLASSES.has(String(props.class ?? '')) && props.brunnel !== 'tunnel';
}
