import type { FlightSize } from './types';

/** Top-down silhouette family from ICAO type designator. */
export type AircraftFamily =
	| 'ga'
	| 'regional'
	| 'narrow'
	| 'wide-twin'
	| 'wide-quad'
	| 'rotor';

export type AirlineLivery = {
	code: string;
	name: string;
	fin: string;
	stripe: string;
	bodyTint: string;
};

export type AircraftPaint = {
	family: AircraftFamily;
	livery: AirlineLivery | null;
	size: FlightSize;
};

export function sizeFromCategory(category: string | null | undefined): FlightSize | null {
	if (!category) return null;
	const code = category.trim().toUpperCase();
	if (code === 'A7' || code.startsWith('B') || code === 'C0') return 'rotor';
	if (code === 'A1' || code === 'A0') return 'light';
	if (code === 'A2' || code === 'A6') return 'medium';
	if (code === 'A3' || code === 'A4' || code === 'A5') return 'heavy';
	return null;
}

export function familyFromTypeCode(typeCode: string | null | undefined): AircraftFamily | null {
	if (!typeCode) return null;
	const t = typeCode.trim().toUpperCase();
	if (!t) return null;
	if (/^(H\d|R\d|A139|A189|B06|B407|B412|B429|EC2|EC3|EC4|EC5|EC7|AS3|S76|S92)/.test(t) || t.includes('HELI')) {
		return 'rotor';
	}
	if (/^(A388|B74|B748|A124)/.test(t)) return 'wide-quad';
	if (/^(A3[3-5]|A359|A35K|B76|B77|B78|B789|B78X|MD11)/.test(t)) return 'wide-twin';
	if (/^(E17|E19|E29|E75|E190|E195|CRJ|AT7|AT75|AT76|DH8|DHC)/.test(t)) return 'regional';
	if (/^(A31|A32|A20|A21|A19|B73|B38|B39|B3M|BCS)/.test(t)) return 'narrow';
	if (/^(C1|C2|PA|SR2|SR3|DA4|DA6|P28|BE3|BE36|M20|E55|E50|PC12|TBM|GLF|LJ|C25|C56|C68)/.test(t)) {
		return 'ga';
	}
	return null;
}

export function sizeFromTypeCode(typeCode: string | null | undefined): FlightSize | null {
	const family = familyFromTypeCode(typeCode);
	if (!family) return null;
	if (family === 'rotor') return 'rotor';
	if (family === 'ga') return 'light';
	if (family === 'regional' || family === 'narrow') return 'medium';
	return 'heavy';
}

export function inferFlightSize(input: {
	category?: string | null;
	typeCode?: string | null;
	speedKts?: number | null;
	altitudeFt?: number | null;
	onGround?: boolean;
}): FlightSize {
	return (
		sizeFromCategory(input.category) ||
		sizeFromTypeCode(input.typeCode) ||
		sizeFromKinematics(input.speedKts, input.altitudeFt, input.onGround)
	);
}

export function inferAircraftFamily(input: {
	category?: string | null;
	typeCode?: string | null;
	size?: FlightSize;
}): AircraftFamily {
	const fromType = familyFromTypeCode(input.typeCode);
	if (fromType) return fromType;
	if (sizeFromCategory(input.category) === 'rotor' || input.size === 'rotor') return 'rotor';
	if (input.size === 'light') return 'ga';
	if (input.size === 'heavy') return 'wide-twin';
	return 'narrow';
}

function sizeFromKinematics(
	speedKts: number | null | undefined,
	altitudeFt: number | null | undefined,
	onGround?: boolean
): FlightSize {
	if (onGround) return 'medium';
	const speed = speedKts ?? 0;
	const alt = altitudeFt ?? 0;
	if (speed > 0 && speed < 140 && alt < 8000) return 'light';
	if (speed >= 420 || alt >= 35000) return 'heavy';
	return 'medium';
}

/** ICAO airline codes common around Zürich / Europe / long-haul. */
const AIRLINES: Record<string, Omit<AirlineLivery, 'code'>> = {
	SWR: { name: 'Swiss', fin: '#e30613', stripe: '#e30613', bodyTint: '#ffffff' },
	DLH: { name: 'Lufthansa', fin: '#05164d', stripe: '#ffcc00', bodyTint: '#f4f6f8' },
	AFR: { name: 'Air France', fin: '#002157', stripe: '#e1000f', bodyTint: '#ffffff' },
	BAW: { name: 'British Airways', fin: '#075aaa', stripe: '#eb1c24', bodyTint: '#ffffff' },
	EZY: { name: 'easyJet', fin: '#ff6600', stripe: '#ff6600', bodyTint: '#ffffff' },
	EJU: { name: 'easyJet Europe', fin: '#ff6600', stripe: '#ff6600', bodyTint: '#ffffff' },
	EZS: { name: 'easyJet Switzerland', fin: '#ff6600', stripe: '#ff6600', bodyTint: '#ffffff' },
	RYR: { name: 'Ryanair', fin: '#073590', stripe: '#f1c233', bodyTint: '#ffffff' },
	KLM: { name: 'KLM', fin: '#00a1e4', stripe: '#00a1e4', bodyTint: '#ffffff' },
	UAE: { name: 'Emirates', fin: '#d71a21', stripe: '#d71a21', bodyTint: '#ffffff' },
	QTR: { name: 'Qatar', fin: '#5c0a2c', stripe: '#8a1538', bodyTint: '#f7f3ea' },
	ETD: { name: 'Etihad', fin: '#bd8b2e', stripe: '#1c1c1c', bodyTint: '#f5f5f0' },
	THY: { name: 'Turkish', fin: '#c8102e', stripe: '#c8102e', bodyTint: '#ffffff' },
	AUA: { name: 'Austrian', fin: '#e4002b', stripe: '#e4002b', bodyTint: '#ffffff' },
	OAW: { name: 'Helvetic', fin: '#e30613', stripe: '#e30613', bodyTint: '#ffffff' },
	EWG: { name: 'Eurowings', fin: '#7c1a78', stripe: '#e30613', bodyTint: '#ffffff' },
	CFG: { name: 'Condor', fin: '#ffcc00', stripe: '#1d1d1b', bodyTint: '#ffffff' },
	VLG: { name: 'Vueling', fin: '#ffcc00', stripe: '#5c068c', bodyTint: '#ffffff' },
	IBE: { name: 'Iberia', fin: '#d7192d', stripe: '#d7192d', bodyTint: '#ffffff' },
	TAP: { name: 'TAP', fin: '#006600', stripe: '#cc0000', bodyTint: '#ffffff' },
	SAS: { name: 'SAS', fin: '#003366', stripe: '#003366', bodyTint: '#ffffff' },
	FIN: { name: 'Finnair', fin: '#0b1560', stripe: '#0b1560', bodyTint: '#ffffff' },
	LOT: { name: 'LOT', fin: '#003366', stripe: '#d21034', bodyTint: '#ffffff' },
	WZZ: { name: 'Wizz', fin: '#c6007e', stripe: '#c6007e', bodyTint: '#ffffff' },
	BEL: { name: 'Brussels', fin: '#003d79', stripe: '#003d79', bodyTint: '#ffffff' },
	AZA: { name: 'ITA', fin: '#006643', stripe: '#009246', bodyTint: '#ffffff' },
	UAL: { name: 'United', fin: '#002244', stripe: '#3399cc', bodyTint: '#ffffff' },
	AAL: { name: 'American', fin: '#0078d2', stripe: '#c60c30', bodyTint: '#ffffff' },
	DAL: { name: 'Delta', fin: '#003366', stripe: '#c8102e', bodyTint: '#ffffff' },
	ACA: { name: 'Air Canada', fin: '#f01428', stripe: '#f01428', bodyTint: '#ffffff' },
	SIA: { name: 'Singapore', fin: '#1d4886', stripe: '#1d4886', bodyTint: '#f4f0e6' },
	CPA: { name: 'Cathay', fin: '#006564', stripe: '#006564', bodyTint: '#ffffff' },
	QFA: { name: 'Qantas', fin: '#e0001b', stripe: '#e0001b', bodyTint: '#ffffff' },
	JAL: { name: 'JAL', fin: '#e60012', stripe: '#e60012', bodyTint: '#ffffff' },
	ANA: { name: 'ANA', fin: '#003366', stripe: '#003366', bodyTint: '#ffffff' },
	ETH: { name: 'Ethiopian', fin: '#00843d', stripe: '#fcd116', bodyTint: '#ffffff' },
	PGT: { name: 'Pegasus', fin: '#f7a800', stripe: '#1d1d1b', bodyTint: '#ffffff' },
	SXS: { name: 'SunExpress', fin: '#f7a800', stripe: '#003366', bodyTint: '#ffffff' },
	TOM: { name: 'TUI Airways', fin: '#1e3a8a', stripe: '#1e3a8a', bodyTint: '#ffffff' }
};

/** Common IATA → ICAO for callsigns that use the ticket code. */
const IATA_TO_ICAO: Record<string, string> = {
	LX: 'SWR',
	LH: 'DLH',
	AF: 'AFR',
	BA: 'BAW',
	U2: 'EZY',
	FR: 'RYR',
	KL: 'KLM',
	EK: 'UAE',
	QR: 'QTR',
	EY: 'ETD',
	TK: 'THY',
	OS: 'AUA',
	EW: 'EWG',
	DE: 'CFG',
	VY: 'VLG',
	IB: 'IBE',
	TP: 'TAP',
	SK: 'SAS',
	AY: 'FIN',
	LO: 'LOT',
	W6: 'WZZ',
	SN: 'BEL',
	AZ: 'AZA',
	UA: 'UAL',
	AA: 'AAL',
	DL: 'DAL',
	AC: 'ACA',
	SQ: 'SIA',
	CX: 'CPA',
	QF: 'QFA',
	JL: 'JAL',
	NH: 'ANA',
	ET: 'ETH',
	PC: 'PGT',
	XQ: 'SXS',
	BY: 'TOM'
};

export function airlineFromCallsign(callsign: string | null | undefined): AirlineLivery | null {
	if (!callsign) return null;
	const cleaned = callsign.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
	if (cleaned.length < 2) return null;

	const icao3 = cleaned.slice(0, 3);
	if (AIRLINES[icao3]) return { code: icao3, ...AIRLINES[icao3] };

	// IATA ticket codes are usually 2 chars followed by digits (LX123, U21234).
	const iata2 = cleaned.slice(0, 2);
	const mapped = IATA_TO_ICAO[iata2];
	if (mapped && AIRLINES[mapped] && (cleaned.length === 2 || /^\d/.test(cleaned[2] || ''))) {
		return { code: mapped, ...AIRLINES[mapped] };
	}

	return null;
}

export function paintFromFlight(input: {
	callsign?: string | null;
	typeCode?: string | null;
	category?: string | null;
	size?: FlightSize;
}): AircraftPaint {
	const size =
		input.size ||
		inferFlightSize({ category: input.category, typeCode: input.typeCode });
	return {
		size,
		family: inferAircraftFamily({
			category: input.category,
			typeCode: input.typeCode,
			size
		}),
		livery: airlineFromCallsign(input.callsign)
	};
}

export function aircraftIconId(paint: AircraftPaint): string {
	const airline = paint.livery?.code.toLowerCase() || 'gen';
	return `plane-${paint.family}-${airline}`;
}

/** Fallback icons registered at map boot (generic liveries). */
export const FLIGHT_ICON_IDS: Record<FlightSize, string> = {
	light: 'plane-ga-gen',
	medium: 'plane-narrow-gen',
	heavy: 'plane-wide-twin-gen',
	rotor: 'plane-rotor-gen'
};

const FAMILY_SIZE: Record<AircraftFamily, FlightSize> = {
	ga: 'light',
	regional: 'medium',
	narrow: 'medium',
	'wide-twin': 'heavy',
	'wide-quad': 'heavy',
	rotor: 'rotor'
};

/** Generic (no-airline) icon for every airframe family. */
export const GENERIC_FAMILY_ICON_IDS: Record<AircraftFamily, string> = {
	ga: 'plane-ga-gen',
	regional: 'plane-regional-gen',
	narrow: 'plane-narrow-gen',
	'wide-twin': 'plane-wide-twin-gen',
	'wide-quad': 'plane-wide-quad-gen',
	rotor: 'plane-rotor-gen'
};

export function genericPaint(family: AircraftFamily): AircraftPaint {
	return { family, livery: null, size: FAMILY_SIZE[family] };
}

type Palette = {
	body: string;
	bodyShade: string;
	bodyLight: string;
	wing: string;
	wingShade: string;
	engine: string;
	engineRim: string;
	glass: string;
	stroke: string;
	fin: string;
	stripe: string;
};

function paletteFor(livery: AirlineLivery | null): Palette {
	const body = livery?.bodyTint || '#e8edf2';
	return {
		body,
		bodyShade: shade(body, -28),
		bodyLight: shade(body, 18),
		wing: shade(body, -8),
		wingShade: shade(body, -36),
		engine: '#6b7582',
		engineRim: '#2f3640',
		glass: '#3d5a73',
		stroke: '#1c2430',
		fin: livery?.fin || '#c9a227',
		stripe: livery?.stripe || livery?.fin || '#c9a227'
	};
}

function shade(hex: string, amount: number): string {
	const n = hex.replace('#', '');
	const full = n.length === 3 ? n.split('').map((c) => c + c).join('') : n;
	const num = Number.parseInt(full || 'e8edf2', 16);
	const r = Math.min(255, Math.max(0, ((num >> 16) & 255) + amount));
	const g = Math.min(255, Math.max(0, ((num >> 8) & 255) + amount));
	const b = Math.min(255, Math.max(0, (num & 255) + amount));
	return `rgb(${r},${g},${b})`;
}

/** Realistic top-down aircraft; nose up. Accepts size string or full paint. */
export function drawAircraftIcon(
	paint: AircraftPaint | FlightSize,
	pixelSize = 160
): ImageData | null {
	const resolved: AircraftPaint =
		typeof paint === 'string'
			? {
					family:
						paint === 'rotor'
							? 'rotor'
							: paint === 'light'
								? 'ga'
								: paint === 'heavy'
									? 'wide-twin'
									: 'narrow',
					livery: null,
					size: paint
				}
			: paint;

	const canvas = document.createElement('canvas');
	canvas.width = pixelSize;
	canvas.height = pixelSize;
	const ctx = canvas.getContext('2d');
	if (!ctx) return null;
	ctx.clearRect(0, 0, pixelSize, pixelSize);
	ctx.translate(pixelSize / 2, pixelSize / 2);
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	ctx.imageSmoothingEnabled = true;

	const p = paletteFor(resolved.livery);
	switch (resolved.family) {
		case 'rotor':
			drawRotor(ctx, pixelSize, p);
			break;
		case 'ga':
			drawGa(ctx, pixelSize, p);
			break;
		case 'regional':
			drawRegional(ctx, pixelSize, p);
			break;
		case 'wide-quad':
			drawWideQuad(ctx, pixelSize, p);
			break;
		case 'wide-twin':
			drawWideTwin(ctx, pixelSize, p);
			break;
		default:
			drawNarrow(ctx, pixelSize, p);
	}
	return ctx.getImageData(0, 0, pixelSize, pixelSize);
}

function softShadow(ctx: CanvasRenderingContext2D, path: () => void, blur: number, alpha = 0.28) {
	ctx.save();
	ctx.translate(blur * 0.35, blur * 0.55);
	ctx.fillStyle = `rgba(8, 12, 18, ${alpha})`;
	path();
	ctx.fill();
	ctx.restore();
}

function fillStroke(
	ctx: CanvasRenderingContext2D,
	path: () => void,
	fill: string,
	stroke: string,
	lineWidth: number
) {
	ctx.fillStyle = fill;
	ctx.strokeStyle = stroke;
	ctx.lineWidth = lineWidth;
	path();
	ctx.fill();
	ctx.stroke();
}

function wingGradient(
	ctx: CanvasRenderingContext2D,
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	p: Palette
) {
	const g = ctx.createLinearGradient(x0, y0, x1, y1);
	g.addColorStop(0, p.wingShade);
	g.addColorStop(0.35, p.wing);
	g.addColorStop(0.7, p.bodyLight);
	g.addColorStop(1, p.wingShade);
	return g;
}

function drawEngine(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	rx: number,
	ry: number,
	p: Palette
) {
	ctx.save();
	ctx.translate(x, y);
	ctx.fillStyle = 'rgba(10, 14, 20, 0.25)';
	ctx.beginPath();
	ctx.ellipse(1.2, 1.5, rx, ry, 0, 0, Math.PI * 2);
	ctx.fill();
	const metal = ctx.createLinearGradient(-rx, 0, rx, 0);
	metal.addColorStop(0, p.engineRim);
	metal.addColorStop(0.35, p.engine);
	metal.addColorStop(0.65, '#9aa3ae');
	metal.addColorStop(1, p.engineRim);
	ctx.fillStyle = metal;
	ctx.strokeStyle = p.stroke;
	ctx.lineWidth = Math.max(1, rx * 0.35);
	ctx.beginPath();
	ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = '#121820';
	ctx.beginPath();
	ctx.ellipse(0, -ry * 0.55, rx * 0.55, ry * 0.22, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}

function paintFin(
	ctx: CanvasRenderingContext2D,
	u: number,
	p: Palette,
	opts: { top: number; mid: number; tip: number; halfW: number }
) {
	ctx.fillStyle = p.fin;
	ctx.strokeStyle = p.stroke;
	ctx.lineWidth = 1.3 * u;
	ctx.beginPath();
	ctx.moveTo(0, opts.top * u);
	ctx.lineTo(opts.halfW * u, opts.mid * u);
	ctx.lineTo(0, opts.tip * u);
	ctx.lineTo(-opts.halfW * u, opts.mid * u);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
}

function paintCheatline(
	ctx: CanvasRenderingContext2D,
	u: number,
	p: Palette,
	y0: number,
	y1: number
) {
	ctx.strokeStyle = p.stripe;
	ctx.globalAlpha = 0.85;
	ctx.lineWidth = 1.4 * u;
	ctx.beginPath();
	ctx.moveTo(-3.2 * u, y0 * u);
	ctx.lineTo(-3.2 * u, y1 * u);
	ctx.moveTo(3.2 * u, y0 * u);
	ctx.lineTo(3.2 * u, y1 * u);
	ctx.stroke();
	ctx.globalAlpha = 1;
}

function drawGa(ctx: CanvasRenderingContext2D, s: number, p: Palette) {
	const u = s / 160;
	const fuselage = () => {
		ctx.beginPath();
		ctx.moveTo(0, -40 * u);
		ctx.bezierCurveTo(5 * u, -30 * u, 6 * u, -8 * u, 5.5 * u, 12 * u);
		ctx.quadraticCurveTo(4.5 * u, 26 * u, 0, 34 * u);
		ctx.quadraticCurveTo(-4.5 * u, 26 * u, -5.5 * u, 12 * u);
		ctx.bezierCurveTo(-6 * u, -8 * u, -5 * u, -30 * u, 0, -40 * u);
		ctx.closePath();
	};
	const wing = () => {
		ctx.beginPath();
		ctx.moveTo(-38 * u, 2 * u);
		ctx.lineTo(-7 * u, -5 * u);
		ctx.lineTo(7 * u, -5 * u);
		ctx.lineTo(38 * u, 2 * u);
		ctx.lineTo(36 * u, 9 * u);
		ctx.quadraticCurveTo(20 * u, 11 * u, 7 * u, 10 * u);
		ctx.lineTo(-7 * u, 10 * u);
		ctx.quadraticCurveTo(-20 * u, 11 * u, -36 * u, 9 * u);
		ctx.closePath();
	};
	softShadow(ctx, wing, 3 * u, 0.22);
	softShadow(ctx, fuselage, 2.5 * u, 0.25);
	ctx.fillStyle = wingGradient(ctx, 0, -5 * u, 0, 11 * u, p);
	ctx.strokeStyle = p.stroke;
	ctx.lineWidth = 1.4 * u;
	wing();
	ctx.fill();
	ctx.stroke();
	fillStroke(ctx, fuselage, p.body, p.stroke, 1.5 * u);
	const glass = ctx.createLinearGradient(0, -28 * u, 0, -10 * u);
	glass.addColorStop(0, '#6a8aa4');
	glass.addColorStop(1, '#2a4052');
	ctx.fillStyle = glass;
	ctx.beginPath();
	ctx.moveTo(0, -28 * u);
	ctx.quadraticCurveTo(3.4 * u, -20 * u, 3 * u, -10 * u);
	ctx.lineTo(-3 * u, -10 * u);
	ctx.quadraticCurveTo(-3.4 * u, -20 * u, 0, -28 * u);
	ctx.closePath();
	ctx.fill();
	ctx.strokeStyle = 'rgba(80,90,100,0.35)';
	ctx.lineWidth = 1.2 * u;
	ctx.beginPath();
	ctx.arc(0, -40 * u, 5.5 * u, 0, Math.PI * 2);
	ctx.stroke();
	ctx.fillStyle = p.engineRim;
	ctx.beginPath();
	ctx.arc(0, -40 * u, 1.7 * u, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = p.wing;
	ctx.strokeStyle = p.stroke;
	ctx.lineWidth = 1.3 * u;
	ctx.beginPath();
	ctx.moveTo(-15 * u, 22 * u);
	ctx.lineTo(0, 17 * u);
	ctx.lineTo(15 * u, 22 * u);
	ctx.lineTo(13 * u, 27 * u);
	ctx.lineTo(0, 24 * u);
	ctx.lineTo(-13 * u, 27 * u);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	paintFin(ctx, u, p, { top: 14, mid: 28, tip: 34, halfW: 2.6 });
	paintCheatline(ctx, u, p, -8, 14);
}

function drawRegional(ctx: CanvasRenderingContext2D, s: number, p: Palette) {
	const u = s / 160;
	const fuselage = () => {
		ctx.beginPath();
		ctx.moveTo(0, -42 * u);
		ctx.bezierCurveTo(5.2 * u, -32 * u, 6 * u, -6 * u, 5.5 * u, 14 * u);
		ctx.quadraticCurveTo(4.5 * u, 28 * u, 0, 36 * u);
		ctx.quadraticCurveTo(-4.5 * u, 28 * u, -5.5 * u, 14 * u);
		ctx.bezierCurveTo(-6 * u, -6 * u, -5.2 * u, -32 * u, 0, -42 * u);
		ctx.closePath();
	};
	const wing = () => {
		ctx.beginPath();
		ctx.moveTo(-42 * u, 8 * u);
		ctx.lineTo(-8 * u, -4 * u);
		ctx.lineTo(8 * u, -4 * u);
		ctx.lineTo(42 * u, 8 * u);
		ctx.lineTo(40 * u, 14 * u);
		ctx.quadraticCurveTo(20 * u, 12 * u, 8 * u, 10 * u);
		ctx.lineTo(-8 * u, 10 * u);
		ctx.quadraticCurveTo(-20 * u, 12 * u, -40 * u, 14 * u);
		ctx.closePath();
	};
	softShadow(ctx, wing, 3.2 * u, 0.23);
	softShadow(ctx, fuselage, 2.6 * u, 0.25);
	ctx.fillStyle = wingGradient(ctx, 0, -4 * u, 0, 14 * u, p);
	ctx.strokeStyle = p.stroke;
	ctx.lineWidth = 1.45 * u;
	wing();
	ctx.fill();
	ctx.stroke();
	for (const x of [-18, 18]) drawEngine(ctx, x * u, 9 * u, 3 * u, 6.5 * u, p);
	fillStroke(ctx, fuselage, p.body, p.stroke, 1.55 * u);
	paintCheatline(ctx, u, p, -20, 10);
	const glass = ctx.createLinearGradient(0, -38 * u, 0, -24 * u);
	glass.addColorStop(0, '#6a8aa4');
	glass.addColorStop(1, '#2a4052');
	ctx.fillStyle = glass;
	ctx.beginPath();
	ctx.moveTo(0, -40 * u);
	ctx.quadraticCurveTo(3.8 * u, -33 * u, 3.4 * u, -25 * u);
	ctx.lineTo(-3.4 * u, -25 * u);
	ctx.quadraticCurveTo(-3.8 * u, -33 * u, 0, -40 * u);
	ctx.closePath();
	ctx.fill();
	ctx.fillStyle = p.wing;
	ctx.strokeStyle = p.stroke;
	ctx.lineWidth = 1.3 * u;
	ctx.beginPath();
	ctx.moveTo(-14 * u, 24 * u);
	ctx.lineTo(0, 18 * u);
	ctx.lineTo(14 * u, 24 * u);
	ctx.lineTo(12 * u, 28 * u);
	ctx.lineTo(0, 26 * u);
	ctx.lineTo(-12 * u, 28 * u);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	paintFin(ctx, u, p, { top: 12, mid: 28, tip: 36, halfW: 2.8 });
}

function drawNarrow(ctx: CanvasRenderingContext2D, s: number, p: Palette) {
	const u = s / 160;
	const fuselage = () => {
		ctx.beginPath();
		ctx.moveTo(0, -46 * u);
		ctx.bezierCurveTo(6 * u, -34 * u, 7 * u, -6 * u, 6.5 * u, 16 * u);
		ctx.quadraticCurveTo(5.5 * u, 30 * u, 0, 40 * u);
		ctx.quadraticCurveTo(-5.5 * u, 30 * u, -6.5 * u, 16 * u);
		ctx.bezierCurveTo(-7 * u, -6 * u, -6 * u, -34 * u, 0, -46 * u);
		ctx.closePath();
	};
	const wing = () => {
		ctx.beginPath();
		ctx.moveTo(-52 * u, 12 * u);
		ctx.lineTo(-9 * u, -7 * u);
		ctx.lineTo(9 * u, -7 * u);
		ctx.lineTo(52 * u, 12 * u);
		ctx.lineTo(49 * u, 18 * u);
		ctx.quadraticCurveTo(24 * u, 16 * u, 9 * u, 12 * u);
		ctx.lineTo(-9 * u, 12 * u);
		ctx.quadraticCurveTo(-24 * u, 16 * u, -49 * u, 18 * u);
		ctx.closePath();
	};
	softShadow(ctx, wing, 3.8 * u, 0.24);
	softShadow(ctx, fuselage, 3 * u, 0.26);
	ctx.fillStyle = wingGradient(ctx, 0, -7 * u, 0, 18 * u, p);
	ctx.strokeStyle = p.stroke;
	ctx.lineWidth = 1.55 * u;
	wing();
	ctx.fill();
	ctx.stroke();
	for (const x of [-22, 22]) drawEngine(ctx, x * u, 12 * u, 3.6 * u, 8 * u, p);
	fillStroke(ctx, fuselage, p.body, p.stroke, 1.65 * u);
	paintCheatline(ctx, u, p, -24, 12);
	const glass = ctx.createLinearGradient(0, -42 * u, 0, -26 * u);
	glass.addColorStop(0, '#6a8aa4');
	glass.addColorStop(1, '#2a4052');
	ctx.fillStyle = glass;
	ctx.beginPath();
	ctx.moveTo(0, -44 * u);
	ctx.quadraticCurveTo(4.4 * u, -36 * u, 4 * u, -28 * u);
	ctx.lineTo(-4 * u, -28 * u);
	ctx.quadraticCurveTo(-4.4 * u, -36 * u, 0, -44 * u);
	ctx.closePath();
	ctx.fill();
	ctx.fillStyle = p.wing;
	ctx.strokeStyle = p.stroke;
	ctx.lineWidth = 1.35 * u;
	ctx.beginPath();
	ctx.moveTo(-18 * u, 28 * u);
	ctx.lineTo(0, 22 * u);
	ctx.lineTo(18 * u, 28 * u);
	ctx.lineTo(15 * u, 33 * u);
	ctx.lineTo(0, 30 * u);
	ctx.lineTo(-15 * u, 33 * u);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	paintFin(ctx, u, p, { top: 14, mid: 32, tip: 40, halfW: 3.4 });
}

function drawWideTwin(ctx: CanvasRenderingContext2D, s: number, p: Palette) {
	const u = s / 160;
	const fuselage = () => {
		ctx.beginPath();
		ctx.moveTo(0, -48 * u);
		ctx.bezierCurveTo(8 * u, -34 * u, 9.5 * u, -4 * u, 9 * u, 16 * u);
		ctx.quadraticCurveTo(7.5 * u, 32 * u, 0, 42 * u);
		ctx.quadraticCurveTo(-7.5 * u, 32 * u, -9 * u, 16 * u);
		ctx.bezierCurveTo(-9.5 * u, -4 * u, -8 * u, -34 * u, 0, -48 * u);
		ctx.closePath();
	};
	const wing = () => {
		ctx.beginPath();
		ctx.moveTo(-60 * u, 14 * u);
		ctx.lineTo(-11 * u, -9 * u);
		ctx.lineTo(11 * u, -9 * u);
		ctx.lineTo(60 * u, 14 * u);
		ctx.lineTo(56 * u, 20 * u);
		ctx.quadraticCurveTo(28 * u, 18 * u, 11 * u, 14 * u);
		ctx.lineTo(-11 * u, 14 * u);
		ctx.quadraticCurveTo(-28 * u, 18 * u, -56 * u, 20 * u);
		ctx.closePath();
	};
	softShadow(ctx, wing, 4.2 * u, 0.26);
	softShadow(ctx, fuselage, 3.2 * u, 0.28);
	ctx.fillStyle = wingGradient(ctx, 0, -9 * u, 0, 20 * u, p);
	ctx.strokeStyle = p.stroke;
	ctx.lineWidth = 1.7 * u;
	wing();
	ctx.fill();
	ctx.stroke();
	for (const x of [-28, 28]) drawEngine(ctx, x * u, 13 * u, 4.4 * u, 9.5 * u, p);
	fillStroke(ctx, fuselage, p.body, p.stroke, 1.75 * u);
	paintCheatline(ctx, u, p, -26, 12);
	const glass = ctx.createLinearGradient(0, -44 * u, 0, -28 * u);
	glass.addColorStop(0, '#6a8aa4');
	glass.addColorStop(1, '#2a4052');
	ctx.fillStyle = glass;
	ctx.beginPath();
	ctx.moveTo(0, -46 * u);
	ctx.quadraticCurveTo(5.6 * u, -38 * u, 5.2 * u, -30 * u);
	ctx.lineTo(-5.2 * u, -30 * u);
	ctx.quadraticCurveTo(-5.6 * u, -38 * u, 0, -46 * u);
	ctx.closePath();
	ctx.fill();
	ctx.fillStyle = p.wing;
	ctx.strokeStyle = p.stroke;
	ctx.lineWidth = 1.4 * u;
	ctx.beginPath();
	ctx.moveTo(-22 * u, 28 * u);
	ctx.lineTo(0, 20 * u);
	ctx.lineTo(22 * u, 28 * u);
	ctx.lineTo(18 * u, 34 * u);
	ctx.lineTo(0, 30 * u);
	ctx.lineTo(-18 * u, 34 * u);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	paintFin(ctx, u, p, { top: 12, mid: 32, tip: 42, halfW: 4 });
}

function drawWideQuad(ctx: CanvasRenderingContext2D, s: number, p: Palette) {
	const u = s / 160;
	const fuselage = () => {
		ctx.beginPath();
		ctx.moveTo(0, -50 * u);
		ctx.bezierCurveTo(9 * u, -36 * u, 10.5 * u, -4 * u, 10 * u, 16 * u);
		ctx.quadraticCurveTo(8 * u, 34 * u, 0, 44 * u);
		ctx.quadraticCurveTo(-8 * u, 34 * u, -10 * u, 16 * u);
		ctx.bezierCurveTo(-10.5 * u, -4 * u, -9 * u, -36 * u, 0, -50 * u);
		ctx.closePath();
	};
	const wing = () => {
		ctx.beginPath();
		ctx.moveTo(-64 * u, 16 * u);
		ctx.lineTo(-12 * u, -10 * u);
		ctx.lineTo(12 * u, -10 * u);
		ctx.lineTo(64 * u, 16 * u);
		ctx.lineTo(60 * u, 22 * u);
		ctx.quadraticCurveTo(30 * u, 20 * u, 12 * u, 15 * u);
		ctx.lineTo(-12 * u, 15 * u);
		ctx.quadraticCurveTo(-30 * u, 20 * u, -60 * u, 22 * u);
		ctx.closePath();
	};
	softShadow(ctx, wing, 4.5 * u, 0.27);
	softShadow(ctx, fuselage, 3.4 * u, 0.29);
	ctx.fillStyle = wingGradient(ctx, 0, -10 * u, 0, 22 * u, p);
	ctx.strokeStyle = p.stroke;
	ctx.lineWidth = 1.8 * u;
	wing();
	ctx.fill();
	ctx.stroke();
	for (const x of [-36, -20, 20, 36]) drawEngine(ctx, x * u, 14 * u, 4 * u, 9 * u, p);
	fillStroke(ctx, fuselage, p.body, p.stroke, 1.8 * u);
	paintCheatline(ctx, u, p, -28, 12);
	ctx.fillStyle = p.bodyShade;
	ctx.beginPath();
	ctx.ellipse(0, -28 * u, 7 * u, 10 * u, 0, Math.PI, Math.PI * 2);
	ctx.fill();
	const glass = ctx.createLinearGradient(0, -48 * u, 0, -30 * u);
	glass.addColorStop(0, '#6a8aa4');
	glass.addColorStop(1, '#2a4052');
	ctx.fillStyle = glass;
	ctx.beginPath();
	ctx.moveTo(0, -48 * u);
	ctx.quadraticCurveTo(6 * u, -40 * u, 5.5 * u, -32 * u);
	ctx.lineTo(-5.5 * u, -32 * u);
	ctx.quadraticCurveTo(-6 * u, -40 * u, 0, -48 * u);
	ctx.closePath();
	ctx.fill();
	ctx.fillStyle = p.wing;
	ctx.strokeStyle = p.stroke;
	ctx.lineWidth = 1.45 * u;
	ctx.beginPath();
	ctx.moveTo(-24 * u, 30 * u);
	ctx.lineTo(0, 20 * u);
	ctx.lineTo(24 * u, 30 * u);
	ctx.lineTo(20 * u, 36 * u);
	ctx.lineTo(0, 32 * u);
	ctx.lineTo(-20 * u, 36 * u);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	paintFin(ctx, u, p, { top: 12, mid: 34, tip: 44, halfW: 4.4 });
}

function drawRotor(ctx: CanvasRenderingContext2D, s: number, p: Palette) {
	const u = s / 160;
	const cabin = () => {
		ctx.beginPath();
		ctx.moveTo(0, -20 * u);
		ctx.bezierCurveTo(11 * u, -15 * u, 12 * u, 4 * u, 9 * u, 16 * u);
		ctx.quadraticCurveTo(0, 20 * u, -9 * u, 16 * u);
		ctx.bezierCurveTo(-12 * u, 4 * u, -11 * u, -15 * u, 0, -20 * u);
		ctx.closePath();
	};
	softShadow(ctx, cabin, 2.8 * u, 0.25);
	ctx.strokeStyle = 'rgba(70, 80, 95, 0.28)';
	ctx.lineWidth = 2.2 * u;
	ctx.beginPath();
	ctx.arc(0, -4 * u, 38 * u, 0, Math.PI * 2);
	ctx.stroke();
	ctx.strokeStyle = 'rgba(90, 100, 115, 0.42)';
	ctx.lineWidth = 1.5 * u;
	for (let i = 0; i < 4; i++) {
		const a = (i * Math.PI) / 2 + 0.18;
		ctx.beginPath();
		ctx.moveTo(Math.cos(a) * 4 * u, -4 * u + Math.sin(a) * 4 * u);
		ctx.lineTo(Math.cos(a) * 38 * u, -4 * u + Math.sin(a) * 38 * u);
		ctx.stroke();
	}
	ctx.fillStyle = p.engineRim;
	ctx.beginPath();
	ctx.arc(0, -4 * u, 2.6 * u, 0, Math.PI * 2);
	ctx.fill();
	fillStroke(ctx, cabin, p.body, p.stroke, 1.55 * u);
	ctx.strokeStyle = p.bodyShade;
	ctx.lineWidth = 3.4 * u;
	ctx.beginPath();
	ctx.moveTo(0, 16 * u);
	ctx.lineTo(0, 40 * u);
	ctx.stroke();
	ctx.strokeStyle = p.stroke;
	ctx.lineWidth = 1.2 * u;
	ctx.beginPath();
	ctx.moveTo(0, 16 * u);
	ctx.lineTo(0, 40 * u);
	ctx.stroke();
	ctx.strokeStyle = p.fin;
	ctx.lineWidth = 1.6 * u;
	ctx.beginPath();
	ctx.moveTo(-9 * u, 38 * u);
	ctx.lineTo(9 * u, 38 * u);
	ctx.moveTo(0, 30 * u);
	ctx.lineTo(0, 44 * u);
	ctx.stroke();
	ctx.strokeStyle = p.engineRim;
	ctx.lineWidth = 1.9 * u;
	ctx.beginPath();
	ctx.moveTo(-13 * u, 14 * u);
	ctx.lineTo(-13 * u, 22 * u);
	ctx.lineTo(13 * u, 22 * u);
	ctx.lineTo(13 * u, 14 * u);
	ctx.stroke();
	const glass = ctx.createLinearGradient(0, -18 * u, 0, 0);
	glass.addColorStop(0, '#6a8aa4');
	glass.addColorStop(1, '#2a4052');
	ctx.fillStyle = glass;
	ctx.beginPath();
	ctx.ellipse(0, -9 * u, 6.5 * u, 7.5 * u, 0, Math.PI, Math.PI * 2);
	ctx.fill();
}
