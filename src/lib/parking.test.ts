import { describe, expect, it } from 'vitest';
import { parseParking, availability, distance } from './parking';

describe('parking data', () => {
	it('preserves full garages and resolves provider coordinates', () => {
		const parking = parseParking({
			title: 'Parkhaus Accu / Otto-Schütz-Weg',
			content: 'open / 0',
			link: 'https://www.pls-zh.ch/parkhaus/accu.jsp?pid=accu'
		});
		expect(availability(parking)).toBe('Full');
		expect(parking.coordinates).toEqual([47.41451, 8.541012]);
	});
	it('distinguishes unknown counts and closed garages from available spaces', () => {
		expect(availability(parseParking({ content: 'open / 42' }))).toBe('42 free');
		expect(availability(parseParking({ content: 'open / ' }))).toBe('Unknown');
		expect(availability(parseParking({ content: 'closed / 42' }))).toBe('Closed');
		expect(parseParking({ link: 'javascript:alert(1)' }).link).toBe('');
	});
	it('measures distances in kilometres for nearest-first sorting', () => {
		expect(distance([47, 8], [47, 8])).toBe(0);
		expect(distance([47, 8], [48, 8])).toBeCloseTo(111.195, 2);
	});
});
