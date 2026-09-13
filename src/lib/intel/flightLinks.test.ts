import { describe, expect, it } from 'vitest';
import { planeInfoUrl } from './flightLinks';
import type { Flight } from './types';

function flight(partial: Partial<Flight> & Pick<Flight, 'id' | 'callsign'>): Flight {
	return {
		lat: 47.45,
		lon: 8.56,
		altitudeFt: 12000,
		heading: 90,
		speedKts: 250,
		onGround: false,
		size: 'medium',
		typeCode: 'A320',
		...partial
	};
}

describe('planeInfoUrl', () => {
	it('uses FlightRadar24 aircraft dossier for ICAO24 hex ids', () => {
		expect(planeInfoUrl(flight({ id: '4B1A00', callsign: 'SWR123' }))).toBe(
			'https://www.flightradar24.com/data/aircraft/4b1a00'
		);
	});

	it('falls back to callsign when id is not a hex', () => {
		expect(planeInfoUrl(flight({ id: 'local-1', callsign: 'SWR88A' }))).toBe(
			'https://www.flightradar24.com/SWR88A'
		);
	});
});
