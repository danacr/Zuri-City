import { describe, expect, it } from 'vitest';
import {
	parseParking,
	availability,
	parkingTone,
	spotCount,
	parkingMapLabel,
	distance
} from './parking';
import { parseCapacity, parseCoordinates, enrichParkings } from './server/parking-details';

describe('parking data', () => {
	it('keeps all states and never derives locations or capacities from fixed data', () => {
		const parking = parseParking({
			title: 'Parkhaus Accu / Otto-Schütz-Weg',
			content: 'open / 0',
			link: 'https://www.pls-zh.ch/parkhaus/accu.jsp?pid=accu'
		});
		expect(availability(parking)).toBe('Full');
		expect(parking.coordinates).toBeNull();
		expect(parking.capacity).toBeNull();
		expect(spotCount(parking)).toBe('0 / —');
		expect(parkingMapLabel(parking)).toBe('Full · 0 / —');
	});
	it('labels open garages with free spots out of capacity for the map', () => {
		const open = parseParking({ content: 'open / 42' });
		open.capacity = 120;
		expect(parkingMapLabel(open)).toBe('Open · 42 / 120');
		expect(parkingMapLabel(parseParking({ content: 'closed / 7' }))).toBe('Closed');
	});
	it('uses red for closed even with spaces, and grey for unrecognized or missing availability', () => {
		expect(parkingTone(parseParking({ content: 'closed / 42' }))).toBe('red');
		expect(parkingTone(parseParking({ content: 'open / 0' }))).toBe('red');
		expect(parkingTone(parseParking({ content: 'open / 42' }))).toBe('green');
		expect(parkingTone(parseParking({ content: 'open / ' }))).toBe('grey');
		expect(parkingTone(parseParking({ content: 'unknown / 0' }))).toBe('grey');
		expect(parseParking({ link: 'javascript:alert(1)' }).link).toBe('');
	});
	it('parses capacity and validated coordinates from provider pages', () => {
		expect(parseCapacity('<td>1’000 Plätze</td>')).toBe(1000);
		expect(parseCapacity('<td>194 Pl&auml;tze</td>')).toBe(194);
		expect(parseCapacity('<td>194 free</td>')).toBeNull();
		expect(parseCoordinates("var str = '47.414510, 8.541012' ;")).toEqual([47.41451, 8.541012]);
		expect(parseCoordinates("var str = '999, 8' ;")).toBeNull();
	});
	it('fetches new metadata each time and retains every garage on partial failure', async () => {
		let capacity = 194;
		const fetcher: typeof fetch = async (input) => {
			if (String(input).includes('pid=closed')) throw new Error('Provider unavailable');
			return new Response(
				String(input).includes('parkhausmap')
					? "var str = '47.4, 8.5'"
					: `<td>${capacity} Plätze</td>`
			);
		};
		const items = ['accu', 'closed'].map((id) =>
			parseParking({
				content: id === 'closed' ? 'closed / 7' : 'open / 42',
				link: `https://www.pls-zh.ch/parkhaus/${id}.jsp?pid=${id}`
			})
		);
		const result = await enrichParkings(items, fetcher);
		expect(result).toHaveLength(2);
		expect(result[0].capacity).toBe(194);
		expect(result[1].capacity).toBeNull();
		expect(result[1].free).toBe(7);
		capacity = 250;
		expect((await enrichParkings(items, fetcher))[0].capacity).toBe(250);
	});
	it('measures distances in kilometres for nearest-first sorting', () => {
		expect(distance([47, 8], [47, 8])).toBe(0);
		expect(distance([47, 8], [48, 8])).toBeCloseTo(111.195, 2);
	});
});

it('describes each missing field and unavailable status', async () => {
	const { parkingIssues } = await import('./parking');
	const garage = parseParking({ content: 'offline / ' });
	expect(parkingIssues(garage)).toContain('Unrecognized provider status: offline.');
	expect(parkingIssues(garage)).toContain('Free-space count was not supplied.');
	expect(parkingIssues(garage)).toContain('Total capacity could not be retrieved.');
	expect(parkingIssues(garage)).toContain(
		'Coordinates could not be retrieved; not shown on the map.'
	);
	expect(parkingIssues(parseParking({ content: 'closed / 20' }))).toContain(
		'The provider reports this garage is closed.'
	);
});
