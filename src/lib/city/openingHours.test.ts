import { describe, expect, it } from 'vitest';
import { evaluateOpenNow, openBadge } from './openingHours';

describe('evaluateOpenNow', () => {
	it('treats 24/7 as always open', () => {
		expect(evaluateOpenNow('24/7', new Date('2026-09-12T10:00:00+02:00'))).toBe(true);
	});

	it('evaluates weekday ranges in Europe/Zurich', () => {
		// Saturday 2026-09-12 15:00 Zurich
		const saturdayAfternoon = new Date('2026-09-12T15:00:00+02:00');
		expect(evaluateOpenNow('Mo-Fr 09:00-18:00; Sa 10:00-16:00', saturdayAfternoon)).toBe(true);
		expect(evaluateOpenNow('Mo-Fr 09:00-18:00; Sa 10:00-16:00', new Date('2026-09-12T17:00:00+02:00'))).toBe(
			false
		);
	});

	it('returns null for vague curated text without clock times', () => {
		expect(evaluateOpenNow('Hours vary — check before you go')).toBeNull();
	});

	it('understands open daily curated phrasing', () => {
		expect(evaluateOpenNow('Open daily', new Date('2026-09-12T12:00:00+02:00'))).toBe(true);
	});
});

describe('openBadge', () => {
	it('labels open/closed/unknown', () => {
		expect(openBadge(true)).toBe('Open now');
		expect(openBadge(false)).toBe('Closed now');
		expect(openBadge(null)).toBe('Hours unknown');
	});
});
