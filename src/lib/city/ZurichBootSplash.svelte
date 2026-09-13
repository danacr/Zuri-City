<script lang="ts">
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';

	/** Brief intentional flash — map-ready should win within a beat. */
	export let minMs = 200;
	/** Hard cap so a stalled map never traps the user. */
	export let maxMs = 1800;
	export let ready = false;
	export let failed = false;

	const dispatch = createEventDispatcher<{ done: void }>();

	let visible = true;
	let leaving = false;
	let mountedAt = 0;
	let maxTimer: ReturnType<typeof setTimeout> | undefined;
	let leaveTimer: ReturnType<typeof setTimeout> | undefined;

	function splashEl(): HTMLElement | null {
		if (typeof document === 'undefined') return null;
		return document.getElementById('boot-splash-instant');
	}

	function dismiss() {
		if (leaving || !visible) return;
		leaving = true;
		const elapsed = performance.now() - mountedAt;
		const wait = Math.max(0, minMs - elapsed);
		const el = splashEl();
		// Drop hit-testing immediately so the ready map is usable under the fade.
		el?.classList.add('leaving');
		leaveTimer = setTimeout(() => {
			if (el) window.setTimeout(() => el.remove(), 320);
			visible = false;
			dispatch('done');
		}, wait);
	}

	$: if ((ready || failed) && visible) dismiss();

	onMount(() => {
		// Splash already painted from app.html — only track timing / dismissal here.
		mountedAt = performance.now();
		maxTimer = setTimeout(() => dismiss(), maxMs);
	});

	onDestroy(() => {
		if (maxTimer) clearTimeout(maxTimer);
		if (leaveTimer) clearTimeout(leaveTimer);
	});
</script>
