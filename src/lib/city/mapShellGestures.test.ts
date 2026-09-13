import { describe, expect, it } from 'vitest';
import { classifyTwoFingerGesture } from './mapShellGestures';

describe('classifyTwoFingerGesture', () => {
	it('treats growing finger span as pinch zoom', () => {
		expect(
			classifyTwoFingerGesture({
				startDistance: 80,
				currentDistance: 120,
				totalDy: 6
			})
		).toBe('pinch');
	});

	it('treats parallel vertical drag as page scroll', () => {
		expect(
			classifyTwoFingerGesture({
				startDistance: 90,
				currentDistance: 92,
				totalDy: 28
			})
		).toBe('scroll');
	});

	it('stays undecided while movement is tiny', () => {
		expect(
			classifyTwoFingerGesture({
				startDistance: 100,
				currentDistance: 102,
				totalDy: 3
			})
		).toBe('undecided');
	});
});
