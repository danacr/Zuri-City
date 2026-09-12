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

const SPEED_MPS: Record<Congestion, [number, number]> = {
	free: [11, 16],
	slow: [4, 7],
	jam: [0.8, 2.2]
};

const SPACING_M: Record<Congestion, number> = {
	free: 160,
	slow: 85,
	jam: 42
};

const CAR_COLORS = ['#f4f0e8', '#d7dee8', '#2c333d', '#c45c26', '#3d6b8c', '#e8c547'];

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

		for (const line of asLineCoords(feature.geometry)) {
			if (cars.length >= maxCars) break;
			if (line.length < 2) continue;
			const distanceM = lineLengthM(line);
			if (distanceM < 40) continue;

			const count = Math.max(1, Math.min(8, Math.floor(distanceM / spacing)));
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
					color: CAR_COLORS[Math.floor(rand(seed + 9) * CAR_COLORS.length)]
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
					icon: 'traffic-car'
				},
				geometry: {
					type: 'Point',
					coordinates: position
				}
			};
		})
	};
}

/** Tiny top-down car sprite (nose up). */
export function drawCarIcon(pixelSize = 48): ImageData | null {
	const canvas = document.createElement('canvas');
	canvas.width = pixelSize;
	canvas.height = pixelSize;
	const ctx = canvas.getContext('2d');
	if (!ctx) return null;
	const u = pixelSize / 48;
	ctx.clearRect(0, 0, pixelSize, pixelSize);
	ctx.translate(pixelSize / 2, pixelSize / 2);

	ctx.fillStyle = '#f2efe8';
	ctx.strokeStyle = '#141a22';
	ctx.lineWidth = 1.6 * u;
	roundRect(ctx, -7 * u, -14 * u, 14 * u, 28 * u, 3.5 * u);
	ctx.fill();
	ctx.stroke();

	ctx.fillStyle = '#6a849c';
	roundRect(ctx, -5 * u, -6 * u, 10 * u, 10 * u, 2 * u);
	ctx.fill();

	ctx.fillStyle = 'rgba(255,255,255,0.35)';
	roundRect(ctx, -5 * u, -12 * u, 10 * u, 4 * u, 1.5 * u);
	ctx.fill();

	ctx.fillStyle = '#1a1f28';
	ctx.fillRect(-9 * u, -9 * u, 2.4 * u, 6 * u);
	ctx.fillRect(6.6 * u, -9 * u, 2.4 * u, 6 * u);
	ctx.fillRect(-9 * u, 4 * u, 2.4 * u, 6 * u);
	ctx.fillRect(6.6 * u, 4 * u, 2.4 * u, 6 * u);

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
