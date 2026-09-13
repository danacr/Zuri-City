import type { Flight } from './types';

/**
 * External page with registration / route / photos for an ADS-B contact.
 * Prefers ICAO24 hex (our flight id) → FlightRadar24 aircraft dossier.
 */
export function planeInfoUrl(flight: Flight): string {
	const hex = flight.id.trim().toLowerCase();
	if (/^[0-9a-f]{6}$/.test(hex)) {
		return `https://www.flightradar24.com/data/aircraft/${hex}`;
	}
	const callsign = flight.callsign.trim().replace(/\s+/g, '');
	if (callsign && callsign.toUpperCase() !== 'UNKN') {
		return `https://www.flightradar24.com/${encodeURIComponent(callsign)}`;
	}
	return `https://www.flightradar24.com/${encodeURIComponent(hex || 'data')}`;
}
