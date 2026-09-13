/**
 * Immersive map shell gestures:
 * - One finger / pinch: leave to MapLibre (pan + zoom)
 * - Two-finger vertical drag with stable span: scroll the shell to the footer
 * - Trackpad two-finger scroll (wheel without ctrl): scroll the shell
 * - Ctrl/pinch wheel: leave to MapLibre zoom
 */

export type GestureMode = 'undecided' | 'pinch' | 'scroll';

export function touchDistance(a: Touch, b: Touch) {
	const dx = a.clientX - b.clientX;
	const dy = a.clientY - b.clientY;
	return Math.hypot(dx, dy);
}

export function touchMidY(a: Touch, b: Touch) {
	return (a.clientY + b.clientY) / 2;
}

/** Classify two-finger movement: span change → pinch; parallel vertical drag → page scroll. */
export function classifyTwoFingerGesture(options: {
	startDistance: number;
	currentDistance: number;
	totalDy: number;
	pinchThreshold?: number;
	scrollThreshold?: number;
}): GestureMode {
	const pinchThreshold = options.pinchThreshold ?? 14;
	const scrollThreshold = options.scrollThreshold ?? 10;
	const spanDelta = Math.abs(options.currentDistance - options.startDistance);
	const absDy = Math.abs(options.totalDy);
	if (spanDelta >= pinchThreshold && spanDelta >= absDy * 0.85) return 'pinch';
	if (absDy >= scrollThreshold && absDy > spanDelta * 1.15) return 'scroll';
	return 'undecided';
}

export function attachMapShellGestures(
	stage: HTMLElement,
	getShell: () => HTMLElement | null | undefined
) {
	let mode: GestureMode = 'undecided';
	let startDistance = 0;
	let startMidY = 0;
	let lastMidY = 0;
	let active = false;

	const scrollShell = (dy: number) => {
		const shell = getShell();
		if (!shell || !dy) return;
		shell.scrollTop += dy;
	};

	const onTouchStart = (event: TouchEvent) => {
		if (event.touches.length !== 2) {
			active = false;
			mode = 'undecided';
			return;
		}
		active = true;
		mode = 'undecided';
		startDistance = touchDistance(event.touches[0], event.touches[1]);
		startMidY = touchMidY(event.touches[0], event.touches[1]);
		lastMidY = startMidY;
	};

	const onTouchMove = (event: TouchEvent) => {
		if (!active || event.touches.length !== 2) return;
		const currentDistance = touchDistance(event.touches[0], event.touches[1]);
		const midY = touchMidY(event.touches[0], event.touches[1]);
		const totalDy = startMidY - midY;
		const stepDy = lastMidY - midY;
		lastMidY = midY;

		if (mode === 'undecided') {
			mode = classifyTwoFingerGesture({
				startDistance,
				currentDistance,
				totalDy
			});
		}

		if (mode === 'scroll') {
			// Capture phase + stopPropagation so MapLibre does not treat this as pitch/zoom.
			event.preventDefault();
			event.stopPropagation();
			scrollShell(stepDy);
		}
	};

	const onTouchEnd = () => {
		active = false;
		mode = 'undecided';
	};

	const onWheel = (event: WheelEvent) => {
		// Browser pinch-zoom often sends ctrlKey + wheel; leave that to MapLibre.
		if (event.ctrlKey || event.metaKey) return;
		event.preventDefault();
		event.stopPropagation();
		scrollShell(event.deltaY);
	};

	stage.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
	stage.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
	stage.addEventListener('touchend', onTouchEnd, { capture: true, passive: true });
	stage.addEventListener('touchcancel', onTouchEnd, { capture: true, passive: true });
	stage.addEventListener('wheel', onWheel, { capture: true, passive: false });

	return () => {
		stage.removeEventListener('touchstart', onTouchStart, true);
		stage.removeEventListener('touchmove', onTouchMove, true);
		stage.removeEventListener('touchend', onTouchEnd, true);
		stage.removeEventListener('touchcancel', onTouchEnd, true);
		stage.removeEventListener('wheel', onWheel, true);
	};
}
