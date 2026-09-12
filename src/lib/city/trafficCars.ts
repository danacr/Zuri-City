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

/**
 * Matches street traffic-flow colors. Cars are a zoom-in accent only.
 */
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

/** Wider spacing → fewer green cars; tight spacing → many red cars. */
const SPACING_M: Record<Congestion, number> = {
	free: 220,
	slow: 95,
	jam: 30
};

const MAX_PER_ROAD: Record<Congestion, number> = {
	free: 2,
	slow: 5,
	jam: 12
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

/** Build a car fleet from vector-tile road features currently loaded. */
export function spawnCarsFromRoadFeatures(
	features: Feature[],
	options: { maxCars?: number } = {}
): SimCar[] {
	const maxCars = options.maxCars ?? 110;
	const cars: SimCar[] = [];
	let roadIndex = 0;

	for (const feature of features) {
		if (cars.length >= maxCars) break;
		const props = (feature.properties ?? {}) as Record<string, unknown>;
		const roadClass = String(props.class ?? '');
		if (!ROAD_CLASSES.has(roadClass)) continue;
		if (props.brunnel === 'tunnel') continue;

		const congestion = congestionForRoad(props, feature.id);
		const spacing = SPACING_M[congestion];
		const color = CONGESTION_COLOR[congestion];

		for (const line of asLineCoords(feature.geometry)) {
			if (cars.length >= maxCars) break;
			if (line.length < 2) continue;
			const distanceM = lineLengthM(line);
			if (distanceM < 40) continue;

			const count = Math.max(
				1,
				Math.min(MAX_PER_ROAD[congestion], Math.floor(distanceM / spacing))
			);
			for (let i = 0; i < count; i++) {
				if (cars.length >= maxCars) break;
				const seed = roadIndex * 97 + i * 13 + distanceM;
				const progressM = (distanceM * ((i + rand(seed)) / count)) % distanceM;
				const { bearing } = pointAlongLine(line, progressM);
				cars.push({
					id: `car-${roadIndex}-${i}-${Math.floor(seed)}`,
					line,
					distanceM,
					progressM,
					speedMps: pickSpeed(congestion, seed + 3),
					congestion,
					bearing,
					color
				});
			}
			roadIndex++;
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

/** Small 3D-shaded top-down car (nose up), colored by congestion. */
export function drawCarIcon(
	congestion: Congestion = 'free',
	pixelSize = 64
): ImageData | null {
	const canvas = document.createElement('canvas');
	canvas.width = pixelSize;
	canvas.height = pixelSize;
	const ctx = canvas.getContext('2d');
	if (!ctx) return null;
	/** Fatter drawing so cars read as street-width when icon-size is bumped. */
	const u = (pixelSize / 64) * 1.55;
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
