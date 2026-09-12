import { describe, expect, it } from 'vitest';
import {
	airlineFromCallsign,
	aircraftIconId,
	familyFromTypeCode,
	paintFromFlight
} from './aircraftIcons';

describe('airlineFromCallsign', () => {
	it('maps ICAO Swiss callsigns to Swiss livery', () => {
		const livery = airlineFromCallsign('SWR12AB');
		expect(livery?.code).toBe('SWR');
		expect(livery?.fin).toBe('#e30613');
	});

	it('maps IATA LX callsigns to Swiss', () => {
		expect(airlineFromCallsign('LX1234')?.code).toBe('SWR');
	});

	it('maps Lufthansa ICAO and IATA', () => {
		expect(airlineFromCallsign('DLH8A')?.code).toBe('DLH');
		expect(airlineFromCallsign('LH400')?.code).toBe('DLH');
	});
});

describe('familyFromTypeCode', () => {
	it('classifies common Zürich types', () => {
		expect(familyFromTypeCode('A320')).toBe('narrow');
		expect(familyFromTypeCode('B738')).toBe('narrow');
		expect(familyFromTypeCode('B77W')).toBe('wide-twin');
		expect(familyFromTypeCode('A388')).toBe('wide-quad');
		expect(familyFromTypeCode('E190')).toBe('regional');
		expect(familyFromTypeCode('EC35')).toBe('rotor');
		expect(familyFromTypeCode('C172')).toBe('ga');
	});
});

describe('paintFromFlight', () => {
	it('builds airline + type specific icon ids', () => {
		const paint = paintFromFlight({ callsign: 'SWR123', typeCode: 'A320' });
		expect(paint.family).toBe('narrow');
		expect(paint.livery?.code).toBe('SWR');
		expect(aircraftIconId(paint)).toBe('plane-narrow-swr');
	});

	it('falls back to generic when airline unknown', () => {
		const paint = paintFromFlight({ callsign: 'ZZZ99', typeCode: 'B789' });
		expect(paint.family).toBe('wide-twin');
		expect(aircraftIconId(paint)).toBe('plane-wide-twin-gen');
	});
});
