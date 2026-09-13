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

/** Ensure the full base atlas exists (places + generic aircraft). */
export function ensureBaseIconAtlas(map: MapLibreMap) {
	if (!map.isStyleLoaded()) return;
	registerPlaceIcons(map);
	registerGenericAircraftIcons(map);
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
