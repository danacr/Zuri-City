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
	// A3 = ADS-B "large" (narrowbodies); A4/A5 = high-vortex / heavy.
	if (code === 'A2' || code === 'A3' || code === 'A6') return 'medium';
	if (code === 'A4' || code === 'A5') return 'heavy';
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
	// Gliders / motorgliders / ultralights — not airliners.
	if (/^(GLID|GLID|PARA|BALL|ULAC|GYRO|DISC|G10|G10|AS2|AS26|BR23)/.test(t)) return 'ga';
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
	// bodyTint is tuned for map-scale readability (brand reads at ~40px), not photoreal white.
	SWR: { name: 'Swiss', fin: '#e30613', stripe: '#e30613', bodyTint: '#f7f7f7' },
	DLH: { name: 'Lufthansa', fin: '#05164d', stripe: '#ffcc00', bodyTint: '#f0f2f5' },
	AFR: { name: 'Air France', fin: '#002157', stripe: '#e1000f', bodyTint: '#f4f7fb' },
	BAW: { name: 'British Airways', fin: '#075aaa', stripe: '#eb1c24', bodyTint: '#f5f8fc' },
	EZY: { name: 'easyJet', fin: '#ff6600', stripe: '#ff6600', bodyTint: '#ff7a1a' },
	EJU: { name: 'easyJet Europe', fin: '#ff6600', stripe: '#ff6600', bodyTint: '#ff7a1a' },
	EZS: { name: 'easyJet Switzerland', fin: '#ff6600', stripe: '#ff6600', bodyTint: '#ff7a1a' },
	RYR: { name: 'Ryanair', fin: '#073590', stripe: '#f1c233', bodyTint: '#0a4da3' },
	KLM: { name: 'KLM', fin: '#00a1e4', stripe: '#00a1e4', bodyTint: '#e6f6fc' },
	UAE: { name: 'Emirates', fin: '#d71a21', stripe: '#d71a21', bodyTint: '#f7f0e8' },
	QTR: { name: 'Qatar', fin: '#5c0a2c', stripe: '#8a1538', bodyTint: '#f3ebe0' },
	ETD: { name: 'Etihad', fin: '#bd8b2e', stripe: '#1c1c1c', bodyTint: '#f2efe6' },
	THY: { name: 'Turkish', fin: '#c8102e', stripe: '#c8102e', bodyTint: '#f7f7f7' },
	AUA: { name: 'Austrian', fin: '#e4002b', stripe: '#e4002b', bodyTint: '#f7f7f7' },
	OAW: { name: 'Helvetic', fin: '#e30613', stripe: '#e30613', bodyTint: '#f7f7f7' },
	EWG: { name: 'Eurowings', fin: '#7c1a78', stripe: '#e30613', bodyTint: '#f4eef6' },
	CFG: { name: 'Condor', fin: '#ffcc00', stripe: '#1d1d1b', bodyTint: '#ffe566' },
	VLG: { name: 'Vueling', fin: '#ffcc00', stripe: '#5c068c', bodyTint: '#ffe566' },
	IBE: { name: 'Iberia', fin: '#d7192d', stripe: '#d7192d', bodyTint: '#f7f7f7' },
	TAP: { name: 'TAP', fin: '#006600', stripe: '#cc0000', bodyTint: '#eef6ee' },
	SAS: { name: 'SAS', fin: '#003366', stripe: '#003366', bodyTint: '#e8eef5' },
	FIN: { name: 'Finnair', fin: '#0b1560', stripe: '#0b1560', bodyTint: '#e8ecf5' },
	LOT: { name: 'LOT', fin: '#003366', stripe: '#d21034', bodyTint: '#eef2f7' },
	WZZ: { name: 'Wizz', fin: '#c6007e', stripe: '#c6007e', bodyTint: '#f7e6f1' },
	BEL: { name: 'Brussels', fin: '#003d79', stripe: '#003d79', bodyTint: '#e8eef6' },
	AZA: { name: 'ITA', fin: '#006643', stripe: '#009246', bodyTint: '#e8f5ee' },
	UAL: { name: 'United', fin: '#002244', stripe: '#3399cc', bodyTint: '#e8f0f7' },
	AAL: { name: 'American', fin: '#0078d2', stripe: '#c60c30', bodyTint: '#f5f7fa' },
	DAL: { name: 'Delta', fin: '#003366', stripe: '#c8102e', bodyTint: '#f0f3f7' },
	ACA: { name: 'Air Canada', fin: '#f01428', stripe: '#f01428', bodyTint: '#f7f7f7' },
	SIA: { name: 'Singapore', fin: '#1d4886', stripe: '#1d4886', bodyTint: '#f0ebe0' },
	CPA: { name: 'Cathay', fin: '#006564', stripe: '#006564', bodyTint: '#e8f4f3' },
	QFA: { name: 'Qantas', fin: '#e0001b', stripe: '#e0001b', bodyTint: '#f7f7f7' },
	JAL: { name: 'JAL', fin: '#e60012', stripe: '#e60012', bodyTint: '#f7f7f7' },
	ANA: { name: 'ANA', fin: '#003366', stripe: '#003366', bodyTint: '#e8eef5' },
	ETH: { name: 'Ethiopian', fin: '#00843d', stripe: '#fcd116', bodyTint: '#eef6ee' },
	PGT: { name: 'Pegasus', fin: '#f7a800', stripe: '#1d1d1b', bodyTint: '#ffe08a' },
	SXS: { name: 'SunExpress', fin: '#f7a800', stripe: '#003366', bodyTint: '#ffe08a' },
	TOM: { name: 'TUI Airways', fin: '#1e3a8a', stripe: '#1e3a8a', bodyTint: '#e8eef8' }
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

/** Thin centerline fin (top-down) — airline color without a fighter diamond. */
function paintFin(
	ctx: CanvasRenderingContext2D,
	u: number,
	p: Palette,
	opts: { root: number; tip: number; halfW: number }
) {
	ctx.fillStyle = p.fin;
	ctx.strokeStyle = p.stroke;
	ctx.lineWidth = 1.1 * u;
	ctx.beginPath();
	ctx.moveTo(0, opts.root * u);
	ctx.lineTo(opts.halfW * u, (opts.root + opts.tip) * 0.45 * u);
	ctx.lineTo(0, opts.tip * u);
	ctx.lineTo(-opts.halfW * u, (opts.root + opts.tip) * 0.45 * u);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
}

function paintCheatline(
	ctx: CanvasRenderingContext2D,
	u: number,
	p: Palette,
	y0: number,
	y1: number,
	halfW = 3.2
) {
	ctx.strokeStyle = p.stripe;
	ctx.globalAlpha = 0.9;
	ctx.lineWidth = 2.1 * u;
	ctx.beginPath();
	ctx.moveTo(-halfW * u, y0 * u);
	ctx.lineTo(-halfW * u, y1 * u);
	ctx.moveTo(halfW * u, y0 * u);
	ctx.lineTo(halfW * u, y1 * u);
	ctx.stroke();
	ctx.globalAlpha = 1;
}

type AirlinerSpec = {
	/** Half fuselage width at midsection (units). */
	fuseHalf: number;
	nose: number;
	tail: number;
	/** Wing root leading / trailing Y. */
	wingLead: number;
	wingTrail: number;
	/** Half-span tip X. */
	span: number;
	/** Tip chord trailing offset. */
	tipTrail: number;
	engineX: number;
	engineY: number;
	engineRx: number;
	engineRy: number;
	htpSpan: number;
	htpLead: number;
	htpTrail: number;
	finRoot: number;
	finTip: number;
	finHalf: number;
	cheat0: number;
	cheat1: number;
	engines?: number[];
};

/**
 * Classic top-down airliner glyph (A330-family planform): rounded nose,
 * parallel tube, swept high-aspect wings, under-wing pods, conventional HTP.
 * Avoids the pointed fighter / canard silhouette.
 */
function drawAirliner(ctx: CanvasRenderingContext2D, s: number, p: Palette, spec: AirlinerSpec) {
	const u = s / 160;
	const fh = spec.fuseHalf;
	const fuselage = () => {
		ctx.beginPath();
		// Soft rounded nose (not a fighter tip).
		ctx.moveTo(0, spec.nose * u);
		ctx.bezierCurveTo(fh * 0.55 * u, (spec.nose + 6) * u, fh * u, (spec.nose + 16) * u, fh * u, (spec.nose + 28) * u);
		ctx.lineTo(fh * u, (spec.tail - 18) * u);
		ctx.quadraticCurveTo(fh * 0.75 * u, (spec.tail - 6) * u, 0, spec.tail * u);
		ctx.quadraticCurveTo(-fh * 0.75 * u, (spec.tail - 6) * u, -fh * u, (spec.tail - 18) * u);
		ctx.lineTo(-fh * u, (spec.nose + 28) * u);
		ctx.bezierCurveTo(-fh * u, (spec.nose + 16) * u, -fh * 0.55 * u, (spec.nose + 6) * u, 0, spec.nose * u);
		ctx.closePath();
	};
	const wing = () => {
		const rootLead = spec.wingLead;
		const rootTrail = spec.wingTrail;
		const tipX = spec.span;
		const tipLead = rootLead + 18;
		const tipTrail = tipLead + spec.tipTrail;
		ctx.beginPath();
		ctx.moveTo(-fh * 0.9 * u, rootLead * u);
		ctx.lineTo(-tipX * u, tipLead * u);
		ctx.quadraticCurveTo(-(tipX + 1.5) * u, (tipLead + tipTrail) * 0.5 * u, -tipX * u, tipTrail * u);
		ctx.lineTo(-fh * 0.9 * u, rootTrail * u);
		ctx.lineTo(fh * 0.9 * u, rootTrail * u);
		ctx.lineTo(tipX * u, tipTrail * u);
		ctx.quadraticCurveTo((tipX + 1.5) * u, (tipLead + tipTrail) * 0.5 * u, tipX * u, tipLead * u);
		ctx.lineTo(fh * 0.9 * u, rootLead * u);
		ctx.closePath();
	};
	const htp = () => {
		ctx.beginPath();
		ctx.moveTo(-spec.htpSpan * u, spec.htpLead * u);
		ctx.lineTo(0, (spec.htpLead - 3) * u);
		ctx.lineTo(spec.htpSpan * u, spec.htpLead * u);
		ctx.lineTo(spec.htpSpan * 0.92 * u, spec.htpTrail * u);
		ctx.lineTo(0, (spec.htpTrail - 1) * u);
		ctx.lineTo(-spec.htpSpan * 0.92 * u, spec.htpTrail * u);
		ctx.closePath();
	};

	softShadow(ctx, wing, 3.6 * u, 0.22);
	softShadow(ctx, fuselage, 2.8 * u, 0.24);

	ctx.fillStyle = wingGradient(ctx, 0, spec.wingLead * u, 0, spec.wingTrail * u, p);
	ctx.strokeStyle = p.stroke;
	ctx.lineWidth = 1.45 * u;
	wing();
	ctx.fill();
	ctx.stroke();

	const engineXs = spec.engines ?? [-spec.engineX, spec.engineX];
	for (const x of engineXs) {
		drawEngine(ctx, x * u, spec.engineY * u, spec.engineRx * u, spec.engineRy * u, p);
	}

	fillStroke(ctx, fuselage, p.body, p.stroke, 1.55 * u);
	paintCheatline(ctx, u, p, spec.cheat0, spec.cheat1, fh * 0.55);

	// Cockpit glass — soft oval, not a pointed canopy.
	const glass = ctx.createLinearGradient(0, (spec.nose + 4) * u, 0, (spec.nose + 18) * u);
	glass.addColorStop(0, '#6a8aa4');
	glass.addColorStop(1, '#2a4052');
	ctx.fillStyle = glass;
	ctx.beginPath();
	ctx.ellipse(0, (spec.nose + 11) * u, fh * 0.62 * u, 7 * u, 0, 0, Math.PI * 2);
	ctx.fill();

	ctx.fillStyle = p.wing;
	ctx.strokeStyle = p.stroke;
	ctx.lineWidth = 1.25 * u;
	htp();
	ctx.fill();
	ctx.stroke();

	paintFin(ctx, u, p, {
		root: spec.finRoot,
		tip: spec.finTip,
		halfW: spec.finHalf
	});
}

function drawGa(ctx: CanvasRenderingContext2D, s: number, p: Palette) {
	const u = s / 160;
	const fuselage = () => {
		ctx.beginPath();
		ctx.moveTo(0, -36 * u);
		ctx.bezierCurveTo(4.5 * u, -28 * u, 5.5 * u, -6 * u, 5 * u, 12 * u);
		ctx.quadraticCurveTo(4 * u, 24 * u, 0, 32 * u);
		ctx.quadraticCurveTo(-4 * u, 24 * u, -5 * u, 12 * u);
		ctx.bezierCurveTo(-5.5 * u, -6 * u, -4.5 * u, -28 * u, 0, -36 * u);
		ctx.closePath();
	};
	const wing = () => {
		ctx.beginPath();
		ctx.moveTo(-36 * u, 4 * u);
		ctx.lineTo(-6 * u, -2 * u);
		ctx.lineTo(6 * u, -2 * u);
		ctx.lineTo(36 * u, 4 * u);
		ctx.lineTo(34 * u, 10 * u);
		ctx.quadraticCurveTo(18 * u, 11 * u, 6 * u, 9 * u);
		ctx.lineTo(-6 * u, 9 * u);
		ctx.quadraticCurveTo(-18 * u, 11 * u, -34 * u, 10 * u);
		ctx.closePath();
	};
	softShadow(ctx, wing, 3 * u, 0.22);
	softShadow(ctx, fuselage, 2.5 * u, 0.25);
	ctx.fillStyle = wingGradient(ctx, 0, -2 * u, 0, 11 * u, p);
	ctx.strokeStyle = p.stroke;
	ctx.lineWidth = 1.4 * u;
	wing();
	ctx.fill();
	ctx.stroke();
	fillStroke(ctx, fuselage, p.body, p.stroke, 1.5 * u);
	const glass = ctx.createLinearGradient(0, -28 * u, 0, -12 * u);
	glass.addColorStop(0, '#6a8aa4');
	glass.addColorStop(1, '#2a4052');
	ctx.fillStyle = glass;
	ctx.beginPath();
	ctx.ellipse(0, -22 * u, 3.2 * u, 6 * u, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = p.wing;
	ctx.strokeStyle = p.stroke;
	ctx.lineWidth = 1.3 * u;
	ctx.beginPath();
	ctx.moveTo(-14 * u, 20 * u);
	ctx.lineTo(0, 16 * u);
	ctx.lineTo(14 * u, 20 * u);
	ctx.lineTo(12 * u, 25 * u);
	ctx.lineTo(0, 22 * u);
	ctx.lineTo(-12 * u, 25 * u);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	paintFin(ctx, u, p, { root: 12, tip: 32, halfW: 2.2 });
	paintCheatline(ctx, u, p, -8, 12, 2.8);
}

function drawRegional(ctx: CanvasRenderingContext2D, s: number, p: Palette) {
	drawAirliner(ctx, s, p, {
		fuseHalf: 5.2,
		nose: -42,
		tail: 38,
		wingLead: -2,
		wingTrail: 12,
		span: 44,
		tipTrail: 7,
		engineX: 18,
		engineY: 8,
		engineRx: 3,
		engineRy: 6.5,
		htpSpan: 14,
		htpLead: 22,
		htpTrail: 28,
		finRoot: 14,
		finTip: 36,
		finHalf: 2.4,
		cheat0: -18,
		cheat1: 10
	});
}

function drawNarrow(ctx: CanvasRenderingContext2D, s: number, p: Palette) {
	// A320-family proportions — sibling of the A330 glyph.
	drawAirliner(ctx, s, p, {
		fuseHalf: 5.8,
		nose: -46,
		tail: 42,
		wingLead: -4,
		wingTrail: 14,
		span: 52,
		tipTrail: 8,
		engineX: 22,
		engineY: 10,
		engineRx: 3.5,
		engineRy: 8,
		htpSpan: 16,
		htpLead: 24,
		htpTrail: 32,
		finRoot: 16,
		finTip: 40,
		finHalf: 2.8,
		cheat0: -22,
		cheat1: 12
	});
}

function drawWideTwin(ctx: CanvasRenderingContext2D, s: number, p: Palette) {
	// Airbus A330-ish twin: longer tube, broader span, large under-wing pods.
	drawAirliner(ctx, s, p, {
		fuseHalf: 8.2,
		nose: -50,
		tail: 44,
		wingLead: -6,
		wingTrail: 16,
		span: 62,
		tipTrail: 9,
		engineX: 26,
		engineY: 11,
		engineRx: 4.6,
		engineRy: 10,
		htpSpan: 20,
		htpLead: 24,
		htpTrail: 34,
		finRoot: 14,
		finTip: 44,
		finHalf: 3.2,
		cheat0: -24,
		cheat1: 12
	});
}

function drawWideQuad(ctx: CanvasRenderingContext2D, s: number, p: Palette) {
	drawAirliner(ctx, s, p, {
		fuseHalf: 9,
		nose: -52,
		tail: 46,
		wingLead: -7,
		wingTrail: 17,
		span: 66,
		tipTrail: 10,
		engineX: 28,
		engineY: 12,
		engineRx: 4,
		engineRy: 9,
		htpSpan: 22,
		htpLead: 26,
		htpTrail: 36,
		finRoot: 14,
		finTip: 46,
		finHalf: 3.6,
		cheat0: -26,
		cheat1: 12,
		engines: [-36, -20, 20, 36]
	});
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
