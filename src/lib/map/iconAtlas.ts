/**
 * Pre-register MapLibre style images before any symbol layer / setData.
 * MapLibre 6 resolves missing images via setMissingStyleImageResolver —
 * not styleimagemissing + addImage after the fact.
 */
import type { Map as MapLibreMap } from 'maplibre-gl';
import { PLACE_ICON_IDS, drawPlaceIcon } from '$lib/city/placeIcons';
import type { PlaceCategory } from '$lib/places';
import {
	GENERIC_FAMILY_ICON_IDS,
	aircraftIconId,
	drawAircraftIcon,
	genericPaint,
	paintFromFlight,
	type AircraftFamily,
	type AircraftPaint
} from '$lib/intel/aircraftIcons';
import type { Flight } from '$lib/intel/types';

function imageDataForMap(image: ImageData): {
	width: number;
	height: number;
	data: Uint8Array;
} {
	return {
		width: image.width,
		height: image.height,
		data: new Uint8Array(image.data)
	};
}

function addImageSafe(map: MapLibreMap, id: string, image: ImageData | null) {
	if (!image || map.hasImage(id)) return;
	try {
		map.addImage(id, imageDataForMap(image), { pixelRatio: 2 });
	} catch (error) {
		console.warn('icon atlas add failed', id, error);
	}
}

export function registerPlaceIcons(map: MapLibreMap) {
	for (const category of Object.keys(PLACE_ICON_IDS) as PlaceCategory[]) {
		const id = PLACE_ICON_IDS[category];
		if (map.hasImage(id)) continue;
		addImageSafe(map, id, drawPlaceIcon(category, 128));
	}
}

export function registerGenericAircraftIcons(map: MapLibreMap) {
	const families = Object.keys(GENERIC_FAMILY_ICON_IDS) as AircraftFamily[];
	for (const family of families) {
		const id = GENERIC_FAMILY_ICON_IDS[family];
		if (map.hasImage(id)) continue;
		addImageSafe(map, id, drawAircraftIcon(genericPaint(family), 160));
	}
}

export function registerFlightIcons(map: MapLibreMap, flights: Flight[]) {
	registerGenericAircraftIcons(map);
	for (const flight of flights) {
		const paint = paintFromFlight({
			callsign: flight.callsign,
			typeCode: flight.typeCode,
			size: flight.size
		});
		const id = aircraftIconId(paint);
		if (map.hasImage(id)) continue;
		addImageSafe(map, id, drawAircraftIcon(paint, 160));
	}
}

/** Compact CCTV sprite — not a raw circle “dot”. */
export function drawCameraIcon(pixelSize = 96): ImageData | null {
	const canvas = document.createElement('canvas');
	canvas.width = pixelSize;
	canvas.height = pixelSize;
	const ctx = canvas.getContext('2d');
	if (!ctx) return null;
	const u = pixelSize / 64;
	ctx.clearRect(0, 0, pixelSize, pixelSize);
	ctx.translate(pixelSize / 2, pixelSize / 2);

	ctx.fillStyle = 'rgba(10, 16, 28, 0.3)';
	ctx.beginPath();
	ctx.arc(1.2 * u, 2 * u, 20 * u, 0, Math.PI * 2);
	ctx.fill();

	ctx.fillStyle = '#5b4fcf';
	ctx.beginPath();
	ctx.arc(0, 0, 19 * u, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = '#ffffff';
	ctx.lineWidth = 2.2 * u;
	ctx.stroke();

	ctx.fillStyle = '#ffffff';
	// Camera body
	ctx.beginPath();
	ctx.moveTo(-10 * u, -4 * u);
	ctx.lineTo(4 * u, -6 * u);
	ctx.lineTo(4 * u, 6 * u);
	ctx.lineTo(-10 * u, 4 * u);
	ctx.closePath();
	ctx.fill();
	// Lens
	ctx.beginPath();
	ctx.arc(8 * u, 0, 5.5 * u, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = '#5b4fcf';
	ctx.beginPath();
	ctx.arc(8 * u, 0, 2.4 * u, 0, Math.PI * 2);
	ctx.fill();

	return ctx.getImageData(0, 0, pixelSize, pixelSize);
}

export function registerCameraIcon(map: MapLibreMap) {
	if (map.hasImage('camera-cctv')) return;
	addImageSafe(map, 'camera-cctv', drawCameraIcon(96));
}


const PARKING_ICON_COLORS: Record<'green' | 'red' | 'blue', string> = {
	green: '#2f9e44',
	red: '#e03131',
	blue: '#1c7ed6'
};

/** Parking POI sprite — blue/green/red "P" disc (not a landmark pin). */
export function drawParkingIcon(
	tone: 'green' | 'red' | 'blue' = 'blue',
	pixelSize = 96
): ImageData | null {
	const canvas = document.createElement('canvas');
	canvas.width = pixelSize;
	canvas.height = pixelSize;
	const ctx = canvas.getContext('2d');
	if (!ctx) return null;
	const u = pixelSize / 64;
	ctx.clearRect(0, 0, pixelSize, pixelSize);
	ctx.translate(pixelSize / 2, pixelSize / 2);

	ctx.fillStyle = 'rgba(10, 16, 28, 0.28)';
	ctx.beginPath();
	ctx.arc(1.2 * u, 2 * u, 20 * u, 0, Math.PI * 2);
	ctx.fill();

	ctx.fillStyle = PARKING_ICON_COLORS[tone];
	ctx.beginPath();
	ctx.arc(0, 0, 19 * u, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = '#ffffff';
	ctx.lineWidth = 2.4 * u;
	ctx.stroke();

	ctx.fillStyle = '#ffffff';
	ctx.font = `bold ${22 * u}px system-ui, sans-serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText('P', 0, 1.2 * u);

	return ctx.getImageData(0, 0, pixelSize, pixelSize);
}

export function registerParkingIcons(map: MapLibreMap) {
	for (const tone of ['green', 'red', 'blue'] as const) {
		const id = `parking-${tone}`;
		if (map.hasImage(id)) continue;
		addImageSafe(map, id, drawParkingIcon(tone, 96));
	}
}

/** Ensure the full base atlas exists (places + aircraft + camera + parking). */
export function ensureBaseIconAtlas(map: MapLibreMap) {
	if (!map.isStyleLoaded()) return;
	registerPlaceIcons(map);
	registerGenericAircraftIcons(map);
	registerCameraIcon(map);
	registerParkingIcons(map);
}

function paintFromPlaneImageId(id: string): AircraftPaint | null {
	if (!id.startsWith('plane-')) return null;
	const parts = id.split('-');
	let family: AircraftFamily = 'narrow';
	let airline = 'gen';
	if (parts[1] === 'wide' && (parts[2] === 'twin' || parts[2] === 'quad')) {
		family = parts[2] === 'twin' ? 'wide-twin' : 'wide-quad';
		airline = parts[3] || 'gen';
	} else if (
		parts[1] === 'ga' ||
		parts[1] === 'regional' ||
		parts[1] === 'narrow' ||
		parts[1] === 'rotor'
	) {
		family = parts[1];
		airline = parts[2] || 'gen';
	} else {
		return null;
	}
	const livery =
		airline !== 'gen' ? paintFromFlight({ callsign: airline.toUpperCase() + '1' }).livery : null;
	return {
		family,
		livery,
		size:
			family === 'ga'
				? 'light'
				: family === 'rotor'
					? 'rotor'
					: family.startsWith('wide')
						? 'heavy'
						: 'medium'
	};
}

/**
 * MapLibre 6 missing-image resolver — covers place-* discs and plane-* sprites.
 * Call once after Map construction; safe to call again after style reloads.
 */
export function attachIconAtlasResolver(map: MapLibreMap) {
	map.setMissingStyleImageResolver((id) => {
		if (id.startsWith('place-')) {
			registerPlaceIcons(map);
			return;
		}
		if (id === 'camera-cctv') {
			registerCameraIcon(map);
			return;
		}
		if (id.startsWith('parking-')) {
			registerParkingIcons(map);
			return;
		}
		if (id.startsWith('plane-')) {
			const paint = paintFromPlaneImageId(id);
			if (!paint) {
				registerGenericAircraftIcons(map);
				return;
			}
			addImageSafe(map, id, drawAircraftIcon(paint, 160));
		}
	});
}
