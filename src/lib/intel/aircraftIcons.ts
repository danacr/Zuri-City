import type { FlightSize } from './types';

/** ADS-B emitter category → rough size class. */
export function sizeFromCategory(category: string | null | undefined): FlightSize | null {
	if (!category) return null;
	const code = category.trim().toUpperCase();
	if (code === 'A7' || code.startsWith('B') || code === 'C0') return 'rotor';
	if (code === 'A1' || code === 'A0') return 'light';
	if (code === 'A2' || code === 'A6') return 'medium';
	if (code === 'A3' || code === 'A4' || code === 'A5') return 'heavy';
	return null;
}

/** ICAO type designator heuristics (B738, A320, C172, …). */
export function sizeFromTypeCode(typeCode: string | null | undefined): FlightSize | null {
	if (!typeCode) return null;
	const t = typeCode.trim().toUpperCase();
	if (!t) return null;

	const rotor = /^(H\d|R\d|A139|A189|B06|B407|B412|B429|EC2|EC3|EC4|EC5|EC7|AS3|S76|S92)/;
	if (rotor.test(t) || t.includes('HELI')) return 'rotor';

	const light =
		/^(C1|C2|PA|SR2|SR3|DA4|DA6|P28|BE3|BE36|M20|E55|E50|PC12|TBM|GLF|LJ|C25|C56|C68|EA5)/;
	if (light.test(t)) return 'light';

	const heavy =
		/^(A3[3-5]|A38|B7[47]|B7[78]|B74|B76|B77|B78|MD1|IL9|AN12|A124|A388|B748)/;
	if (heavy.test(t)) return 'heavy';

	const medium = /^(A31|A32|A20|A21|B73|B38|B39|E17|E19|E29|E75|CRJ|AT7|DH8|BCS)/;
	if (medium.test(t)) return 'medium';

	return null;
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

export const FLIGHT_ICON_IDS: Record<FlightSize, string> = {
	light: 'plane-light',
	medium: 'plane-medium',
	heavy: 'plane-heavy',
	rotor: 'plane-rotor'
};

/** Top-down silhouettes; nose points up (heading 0). */
export function drawAircraftIcon(
	size: FlightSize,
	pixelSize = 96
): ImageData | null {
	const canvas = document.createElement('canvas');
	canvas.width = pixelSize;
	canvas.height = pixelSize;
	const ctx = canvas.getContext('2d');
	if (!ctx) return null;

	ctx.clearRect(0, 0, pixelSize, pixelSize);
	ctx.translate(pixelSize / 2, pixelSize / 2);

	const fill = '#f5c84c';
	const stroke = '#1a1406';
	ctx.fillStyle = fill;
	ctx.strokeStyle = stroke;
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';

	if (size === 'rotor') {
		drawRotor(ctx, pixelSize);
	} else if (size === 'light') {
		drawLightPlane(ctx, pixelSize);
	} else if (size === 'heavy') {
		drawHeavyPlane(ctx, pixelSize);
	} else {
		drawMediumPlane(ctx, pixelSize);
	}

	return ctx.getImageData(0, 0, pixelSize, pixelSize);
}

function drawLightPlane(ctx: CanvasRenderingContext2D, s: number) {
	const u = s / 96;
	ctx.lineWidth = 2.2 * u;
	// Fuselage
	ctx.beginPath();
	ctx.moveTo(0, -28 * u);
	ctx.quadraticCurveTo(5 * u, -10 * u, 4 * u, 16 * u);
	ctx.lineTo(0, 22 * u);
	ctx.lineTo(-4 * u, 16 * u);
	ctx.quadraticCurveTo(-5 * u, -10 * u, 0, -28 * u);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	// High wing
	ctx.beginPath();
	ctx.moveTo(-30 * u, -2 * u);
	ctx.lineTo(-4 * u, 2 * u);
	ctx.lineTo(4 * u, 2 * u);
	ctx.lineTo(30 * u, -2 * u);
	ctx.lineTo(30 * u, 4 * u);
	ctx.lineTo(4 * u, 8 * u);
	ctx.lineTo(-4 * u, 8 * u);
	ctx.lineTo(-30 * u, 4 * u);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	// Tail
	ctx.beginPath();
	ctx.moveTo(-12 * u, 16 * u);
	ctx.lineTo(0, 12 * u);
	ctx.lineTo(12 * u, 16 * u);
	ctx.lineTo(0, 20 * u);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
}

function drawMediumPlane(ctx: CanvasRenderingContext2D, s: number) {
	const u = s / 96;
	ctx.lineWidth = 2.4 * u;
	// Fuselage
	ctx.beginPath();
	ctx.moveTo(0, -32 * u);
	ctx.quadraticCurveTo(6 * u, -8 * u, 5 * u, 18 * u);
	ctx.lineTo(0, 28 * u);
	ctx.lineTo(-5 * u, 18 * u);
	ctx.quadraticCurveTo(-6 * u, -8 * u, 0, -32 * u);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	// Swept wing
	ctx.beginPath();
	ctx.moveTo(-38 * u, 6 * u);
	ctx.lineTo(-6 * u, -2 * u);
	ctx.lineTo(6 * u, -2 * u);
	ctx.lineTo(38 * u, 6 * u);
	ctx.lineTo(36 * u, 12 * u);
	ctx.lineTo(6 * u, 8 * u);
	ctx.lineTo(-6 * u, 8 * u);
	ctx.lineTo(-36 * u, 12 * u);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	// Engines (under-wing pods)
	for (const x of [-18, 18]) {
		ctx.beginPath();
		ctx.ellipse(x * u, 8 * u, 3.2 * u, 6 * u, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
	}
	// Tailplane
	ctx.beginPath();
	ctx.moveTo(-14 * u, 20 * u);
	ctx.lineTo(0, 14 * u);
	ctx.lineTo(14 * u, 20 * u);
	ctx.lineTo(0, 24 * u);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	// Vertical fin cue
	ctx.beginPath();
	ctx.moveTo(0, 10 * u);
	ctx.lineTo(3 * u, 22 * u);
	ctx.lineTo(0, 26 * u);
	ctx.lineTo(-3 * u, 22 * u);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
}

function drawHeavyPlane(ctx: CanvasRenderingContext2D, s: number) {
	const u = s / 96;
	ctx.lineWidth = 2.6 * u;
	// Wide fuselage
	ctx.beginPath();
	ctx.moveTo(0, -34 * u);
	ctx.quadraticCurveTo(8 * u, -6 * u, 7 * u, 16 * u);
	ctx.lineTo(0, 30 * u);
	ctx.lineTo(-7 * u, 16 * u);
	ctx.quadraticCurveTo(-8 * u, -6 * u, 0, -34 * u);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	// Long swept wing
	ctx.beginPath();
	ctx.moveTo(-44 * u, 8 * u);
	ctx.lineTo(-8 * u, -4 * u);
	ctx.lineTo(8 * u, -4 * u);
	ctx.lineTo(44 * u, 8 * u);
	ctx.lineTo(42 * u, 14 * u);
	ctx.lineTo(8 * u, 8 * u);
	ctx.lineTo(-8 * u, 8 * u);
	ctx.lineTo(-42 * u, 14 * u);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	// Twin engines per wing
	for (const x of [-28, -16, 16, 28]) {
		ctx.beginPath();
		ctx.ellipse(x * u, 9 * u, 3.5 * u, 7 * u, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
	}
	// Tail
	ctx.beginPath();
	ctx.moveTo(-18 * u, 20 * u);
	ctx.lineTo(0, 12 * u);
	ctx.lineTo(18 * u, 20 * u);
	ctx.lineTo(0, 26 * u);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
}

function drawRotor(ctx: CanvasRenderingContext2D, s: number) {
	const u = s / 96;
	ctx.lineWidth = 2 * u;
	// Cabin
	ctx.beginPath();
	ctx.ellipse(0, 2 * u, 8 * u, 14 * u, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.stroke();
	// Tail boom
	ctx.beginPath();
	ctx.moveTo(0, 14 * u);
	ctx.lineTo(0, 30 * u);
	ctx.lineWidth = 3 * u;
	ctx.stroke();
	ctx.lineWidth = 2 * u;
	// Main rotor disc (subtle)
	ctx.beginPath();
	ctx.arc(0, -6 * u, 28 * u, 0, Math.PI * 2);
	ctx.strokeStyle = 'rgba(245, 200, 76, 0.45)';
	ctx.lineWidth = 1.5 * u;
	ctx.stroke();
	ctx.strokeStyle = '#1a1406';
	ctx.lineWidth = 2 * u;
	// Rotor blades
	ctx.beginPath();
	ctx.moveTo(-28 * u, -6 * u);
	ctx.lineTo(28 * u, -6 * u);
	ctx.moveTo(0, -34 * u);
	ctx.lineTo(0, 22 * u);
	ctx.stroke();
	// Tail rotor
	ctx.beginPath();
	ctx.moveTo(-8 * u, 28 * u);
	ctx.lineTo(8 * u, 28 * u);
	ctx.stroke();
	// Skids
	ctx.beginPath();
	ctx.moveTo(-10 * u, 12 * u);
	ctx.lineTo(-10 * u, 18 * u);
	ctx.lineTo(10 * u, 18 * u);
	ctx.lineTo(10 * u, 12 * u);
	ctx.stroke();
}
