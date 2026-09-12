import { CATEGORY_COLOR, PLACE_CATEGORIES, type PlaceCategory } from './places';

/** MapLibre image ids for place category markers. */
export const PLACE_ICON_IDS: Record<PlaceCategory, string> = {
	sights: 'place-sights',
	culture: 'place-culture',
	outdoors: 'place-outdoors',
	food: 'place-food',
	cafe: 'place-cafe',
	nightlife: 'place-nightlife',
	shop: 'place-shop',
	daily: 'place-daily',
	wellness: 'place-wellness',
	beauty: 'place-beauty',
	stay: 'place-stay'
};

/** MapLibre match expression → icon id from feature.category. */
export function placeIconExpression(fallback = PLACE_ICON_IDS.sights): unknown[] {
	return [
		'match',
		['get', 'category'],
		...PLACE_CATEGORIES.flatMap((category) => [category, PLACE_ICON_IDS[category]]),
		fallback
	];
}

type GlyphDrawer = (ctx: CanvasRenderingContext2D, u: number) => void;

/**
 * Simple white glyphs on a colored disc — readable as map markers and chip icons.
 * Drawn in a unit space where the disc radius is ~22u inside a 64u canvas.
 */
const GLYPHS: Record<PlaceCategory, GlyphDrawer> = {
	sights: (ctx, u) => {
		// Landmark pin / tower
		ctx.beginPath();
		ctx.moveTo(0, -12 * u);
		ctx.lineTo(7 * u, 2 * u);
		ctx.lineTo(2.5 * u, 2 * u);
		ctx.lineTo(2.5 * u, 11 * u);
		ctx.lineTo(-2.5 * u, 11 * u);
		ctx.lineTo(-2.5 * u, 2 * u);
		ctx.lineTo(-7 * u, 2 * u);
		ctx.closePath();
		ctx.fill();
	},
	culture: (ctx, u) => {
		// Classical pediment
		ctx.beginPath();
		ctx.moveTo(0, -11 * u);
		ctx.lineTo(12 * u, -2 * u);
		ctx.lineTo(-12 * u, -2 * u);
		ctx.closePath();
		ctx.fill();
		for (const x of [-7, 0, 7]) {
			roundRect(ctx, (x - 1.6) * u, -2 * u, 3.2 * u, 12 * u, 0.6 * u);
			ctx.fill();
		}
		roundRect(ctx, -11 * u, 10 * u, 22 * u, 2.2 * u, 0.8 * u);
		ctx.fill();
	},
	outdoors: (ctx, u) => {
		// Tree
		ctx.beginPath();
		ctx.moveTo(0, -13 * u);
		ctx.lineTo(11 * u, 4 * u);
		ctx.lineTo(-11 * u, 4 * u);
		ctx.closePath();
		ctx.fill();
		roundRect(ctx, -2 * u, 3 * u, 4 * u, 10 * u, 1 * u);
		ctx.fill();
	},
	food: (ctx, u) => {
		// Fork + knife
		roundRect(ctx, -8 * u, -11 * u, 2.4 * u, 22 * u, 1 * u);
		ctx.fill();
		for (const x of [-10.5, -6.9, -3.3]) {
			roundRect(ctx, x * u, -11 * u, 1.5 * u, 7 * u, 0.6 * u);
			ctx.fill();
		}
		roundRect(ctx, 4 * u, -11 * u, 3.2 * u, 22 * u, 1.2 * u);
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(4 * u, -11 * u);
		ctx.lineTo(12 * u, -6 * u);
		ctx.lineTo(4 * u, -1 * u);
		ctx.closePath();
		ctx.fill();
	},
	cafe: (ctx, u) => {
		// Cup + steam
		roundRect(ctx, -9 * u, -4 * u, 16 * u, 13 * u, 2.5 * u);
		ctx.fill();
		roundRect(ctx, -7 * u, 9 * u, 12 * u, 2.5 * u, 1 * u);
		ctx.fill();
		ctx.lineWidth = 2.2 * u;
		ctx.strokeStyle = '#ffffff';
		ctx.beginPath();
		ctx.arc(8.5 * u, 2 * u, 4.5 * u, -Math.PI / 2, Math.PI / 2);
		ctx.stroke();
		ctx.lineWidth = 1.6 * u;
		ctx.beginPath();
		ctx.moveTo(-3 * u, -10 * u);
		ctx.quadraticCurveTo(-1 * u, -14 * u, -3 * u, -17 * u);
		ctx.moveTo(2 * u, -10 * u);
		ctx.quadraticCurveTo(4 * u, -14 * u, 2 * u, -17 * u);
		ctx.stroke();
	},
	nightlife: (ctx, u) => {
		// Music note
		ctx.beginPath();
		ctx.ellipse(-2 * u, 8 * u, 5.5 * u, 4 * u, -0.35, 0, Math.PI * 2);
		ctx.fill();
		roundRect(ctx, 1.5 * u, -12 * u, 2.6 * u, 20 * u, 1 * u);
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(4 * u, -12 * u);
		ctx.quadraticCurveTo(14 * u, -10 * u, 12 * u, 0);
		ctx.lineTo(9 * u, -1 * u);
		ctx.quadraticCurveTo(10 * u, -8 * u, 4 * u, -9 * u);
		ctx.closePath();
		ctx.fill();
	},
	shop: (ctx, u) => {
		// Shopping bag
		roundRect(ctx, -10 * u, -3 * u, 20 * u, 16 * u, 2.5 * u);
		ctx.fill();
		ctx.lineWidth = 2.2 * u;
		ctx.strokeStyle = '#ffffff';
		ctx.beginPath();
		ctx.moveTo(-5 * u, -1 * u);
		ctx.quadraticCurveTo(-5 * u, -12 * u, 0, -12 * u);
		ctx.quadraticCurveTo(5 * u, -12 * u, 5 * u, -1 * u);
		ctx.stroke();
	},
	daily: (ctx, u) => {
		// Basket / essentials
		ctx.beginPath();
		ctx.moveTo(-11 * u, -2 * u);
		ctx.lineTo(-8 * u, 11 * u);
		ctx.lineTo(8 * u, 11 * u);
		ctx.lineTo(11 * u, -2 * u);
		ctx.closePath();
		ctx.fill();
		ctx.lineWidth = 2.2 * u;
		ctx.strokeStyle = '#ffffff';
		ctx.beginPath();
		ctx.moveTo(-7 * u, -2 * u);
		ctx.quadraticCurveTo(-7 * u, -12 * u, 0, -12 * u);
		ctx.quadraticCurveTo(7 * u, -12 * u, 7 * u, -2 * u);
		ctx.stroke();
	},
	wellness: (ctx, u) => {
		// Leaf
		ctx.beginPath();
		ctx.moveTo(0, 12 * u);
		ctx.quadraticCurveTo(14 * u, 2 * u, 0, -13 * u);
		ctx.quadraticCurveTo(-14 * u, 2 * u, 0, 12 * u);
		ctx.closePath();
		ctx.fill();
		ctx.strokeStyle = 'rgba(255,255,255,0.55)';
		ctx.lineWidth = 1.6 * u;
		ctx.beginPath();
		ctx.moveTo(0, 10 * u);
		ctx.lineTo(0, -10 * u);
		ctx.stroke();
	},
	beauty: (ctx, u) => {
		// Scissors
		ctx.lineWidth = 2.4 * u;
		ctx.strokeStyle = '#ffffff';
		ctx.lineCap = 'round';
		ctx.beginPath();
		ctx.moveTo(-8 * u, -10 * u);
		ctx.lineTo(8 * u, 10 * u);
		ctx.moveTo(8 * u, -10 * u);
		ctx.lineTo(-8 * u, 10 * u);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(-9 * u, -11 * u, 3.2 * u, 0, Math.PI * 2);
		ctx.arc(9 * u, -11 * u, 3.2 * u, 0, Math.PI * 2);
		ctx.fill();
	},
	stay: (ctx, u) => {
		// Bed
		roundRect(ctx, -12 * u, 2 * u, 24 * u, 8 * u, 2 * u);
		ctx.fill();
		roundRect(ctx, -12 * u, -6 * u, 8 * u, 10 * u, 2 * u);
		ctx.fill();
		roundRect(ctx, -12 * u, 9 * u, 2.5 * u, 5 * u, 1 * u);
		ctx.fill();
		roundRect(ctx, 9.5 * u, 9 * u, 2.5 * u, 5 * u, 1 * u);
		ctx.fill();
	}
};

/** Colored disc + category glyph for MapLibre `addImage`. */
export function drawPlaceIcon(
	category: PlaceCategory,
	pixelSize = 128
): ImageData | null {
	const canvas = document.createElement('canvas');
	canvas.width = pixelSize;
	canvas.height = pixelSize;
	const ctx = canvas.getContext('2d');
	if (!ctx) return null;
	const u = pixelSize / 64;
	const fill = CATEGORY_COLOR[category];

	ctx.clearRect(0, 0, pixelSize, pixelSize);
	ctx.translate(pixelSize / 2, pixelSize / 2);

	ctx.fillStyle = 'rgba(10, 16, 28, 0.28)';
	ctx.beginPath();
	ctx.arc(1.2 * u, 2 * u, 22 * u, 0, Math.PI * 2);
	ctx.fill();

	ctx.fillStyle = fill;
	ctx.beginPath();
	ctx.arc(0, 0, 21 * u, 0, Math.PI * 2);
	ctx.fill();

	ctx.strokeStyle = '#ffffff';
	ctx.lineWidth = 2.4 * u;
	ctx.beginPath();
	ctx.arc(0, 0, 21 * u, 0, Math.PI * 2);
	ctx.stroke();

	ctx.fillStyle = '#ffffff';
	ctx.strokeStyle = '#ffffff';
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	GLYPHS[category](ctx, u);

	return ctx.getImageData(0, 0, pixelSize, pixelSize);
}

/** Tiny data-URL for layer chips / legend (matches map marker colors). */
export function placeIconDataUrl(category: PlaceCategory, pixelSize = 64): string {
	const canvas = document.createElement('canvas');
	canvas.width = pixelSize;
	canvas.height = pixelSize;
	const ctx = canvas.getContext('2d');
	if (!ctx) return '';
	const image = drawPlaceIcon(category, pixelSize);
	if (!image) return '';
	ctx.putImageData(image, 0, 0);
	return canvas.toDataURL('image/png');
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
