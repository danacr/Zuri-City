import { FALLBACK_PARKINGS } from './fallback';
import type { Parking } from './model';

function normalizeName(name: string) {
	return name
		.toLowerCase()
		.replace(/^parkhaus\s+/i, '')
		.replace(/[^a-z0-9äöüéèêà]/g, '');
}

const COORDS_BY_NAME = new Map(
	FALLBACK_PARKINGS.filter((p) => p.coordinates).map((p) => [
		normalizeName(p.name),
		p.coordinates as [number, number]
	])
);

/** Fill missing coordinates on live PLS rows from the curated name→coord table. */
export function assistParkingCoordinates(parkings: Parking[]): Parking[] {
	return parkings.map((parking) => {
		if (parking.coordinates) return parking;
		const coords = COORDS_BY_NAME.get(normalizeName(parking.name));
		if (!coords) return parking;
		return { ...parking, coordinates: coords };
	});
}
