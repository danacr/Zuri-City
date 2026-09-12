<script lang="ts">
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	/** Keep splash visible at least this long so it feels intentional. */
	export let minMs = 900;
	/** Hard cap so a stalled map never traps the user. */
	export let maxMs = 14000;
	export let ready = false;
	export let failed = false;

	const dispatch = createEventDispatcher<{ done: void }>();

	let visible = true;
	let leaving = false;
	let mountedAt = 0;
	let maxTimer: ReturnType<typeof setTimeout> | undefined;
	let leaveTimer: ReturnType<typeof setTimeout> | undefined;

	function dismiss() {
		if (leaving || !visible) return;
		leaving = true;
		const elapsed = performance.now() - mountedAt;
		const wait = Math.max(0, minMs - elapsed);
		leaveTimer = setTimeout(() => {
			visible = false;
			dispatch('done');
		}, wait);
	}

	$: if ((ready || failed) && visible) dismiss();

	onMount(() => {
		mountedAt = performance.now();
		maxTimer = setTimeout(() => dismiss(), maxMs);
	});

	onDestroy(() => {
		if (maxTimer) clearTimeout(maxTimer);
		if (leaveTimer) clearTimeout(leaveTimer);
	});
</script>

{#if visible}
	<div
		class="boot"
		class:leaving
		role="status"
		aria-live="polite"
		aria-busy="true"
		aria-label="Loading Züri City"
		transition:fade={{ duration: 480 }}
	>
		<div class="boot-sky" aria-hidden="true"></div>
		<div class="boot-mist" aria-hidden="true"></div>
		<div class="boot-lake" aria-hidden="true">
			<span class="shimmer"></span>
		</div>

		<svg class="skyline" viewBox="0 0 720 220" aria-hidden="true">
			<!-- Soft ridge behind the city -->
			<path
				class="ridge"
				d="M0 168 C60 150 110 142 170 148 C230 154 270 130 330 126 C390 122 430 138 490 134 C560 128 620 118 720 108 L720 220 L0 220 Z"
			/>
			<!-- Zürich silhouette: left quay → twin Grossmünster → Fraumünster → right shore -->
			<path
				class="city"
				d="M0 188 H48
				L56 176 H72 L78 188
				H110 L118 162 H128 L134 152 L140 162 H150 L158 188
				H190 L196 170 H208 L214 188
				H248
				L252 148 L260 148 L264 118 L272 108 L280 118 L284 148 L292 148 L296 188
				H318
				L322 140 L330 140 L334 96 L342 84 L350 96 L354 140 L362 140 L366 188
				H392
				L398 128 L406 118 L414 128 L420 188
				H448 L454 158 H468 L474 188
				H510 L516 166 H528 L534 188
				H570 L576 150 L584 150 L590 130 L598 150 L606 150 L612 188
				H648 L654 172 H668 L674 188
				H720 V220 H0 Z"
			/>
			<!-- Window glitter -->
			<g class="windows">
				<rect x="122" y="168" width="3" height="3" rx="0.5" />
				<rect x="130" y="168" width="3" height="3" rx="0.5" />
				<rect x="200" y="176" width="3" height="3" rx="0.5" />
				<rect x="268" y="128" width="2.5" height="2.5" rx="0.5" />
				<rect x="276" y="128" width="2.5" height="2.5" rx="0.5" />
				<rect x="340" y="108" width="2.5" height="2.5" rx="0.5" />
				<rect x="348" y="108" width="2.5" height="2.5" rx="0.5" />
				<rect x="404" y="136" width="3" height="3" rx="0.5" />
				<rect x="458" y="166" width="3" height="3" rx="0.5" />
				<rect x="520" y="172" width="3" height="3" rx="0.5" />
				<rect x="588" y="138" width="3" height="3" rx="0.5" />
			</g>
		</svg>

		<div class="boot-brand">
			<p class="kicker">God’s-eye Zürich</p>
			<h1>Züri City</h1>
			<p class="tag">Opening the living city</p>
			<div class="progress" aria-hidden="true">
				<span class="bar"></span>
			</div>
		</div>
	</div>
{/if}

<style>
	.boot {
		position: fixed;
		inset: 0;
		z-index: 80;
		display: grid;
		place-items: end center;
		overflow: hidden;
		pointer-events: all;
		background: #07131f;
		color: #f4f7fb;
		font-family: Quicksand, 'Avenir Next', 'Segoe UI', sans-serif;
	}

	.boot.leaving {
		pointer-events: none;
	}

	.boot-sky {
		position: absolute;
		inset: 0;
		background:
			radial-gradient(ellipse 90% 55% at 50% 18%, rgba(255, 214, 150, 0.28), transparent 58%),
			radial-gradient(ellipse 70% 50% at 78% 30%, rgba(120, 170, 210, 0.18), transparent 55%),
			linear-gradient(180deg, #0a1a2e 0%, #12314a 42%, #1a4a5c 68%, #0e2a38 100%);
		animation: sky-breathe 5.5s ease-in-out infinite alternate;
	}

	.boot-mist {
		position: absolute;
		inset: 0;
		background: radial-gradient(
			ellipse 120% 40% at 50% 62%,
			rgba(220, 235, 245, 0.12),
			transparent 70%
		);
		animation: mist-drift 7s ease-in-out infinite alternate;
	}

	.boot-lake {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 38%;
		background: linear-gradient(
			180deg,
			rgba(40, 110, 130, 0.15) 0%,
			rgba(18, 70, 90, 0.55) 35%,
			rgba(8, 30, 42, 0.92) 100%
		);
		overflow: hidden;
	}

	.shimmer {
		position: absolute;
		top: 18%;
		left: -40%;
		width: 45%;
		height: 28%;
		background: linear-gradient(
			90deg,
			transparent,
			rgba(255, 236, 200, 0.18),
			rgba(255, 255, 255, 0.28),
			rgba(180, 220, 235, 0.16),
			transparent
		);
		transform: skewX(-18deg);
		animation: lake-shimmer 3.4s ease-in-out infinite;
	}

	.skyline {
		position: absolute;
		left: 50%;
		bottom: 26%;
		width: min(920px, 118vw);
		transform: translateX(-50%) translateY(18px);
		opacity: 0;
		animation: skyline-rise 1.15s cubic-bezier(0.22, 1, 0.36, 1) 0.12s forwards;
		filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.35));
	}

	.ridge {
		fill: #16344a;
		opacity: 0.85;
	}

	.city {
		fill: #0b1c2a;
	}

	.windows rect {
		fill: #f0b429;
		opacity: 0.35;
		animation: window-twinkle 2.8s ease-in-out infinite;
	}

	.windows rect:nth-child(2n) {
		animation-delay: 0.4s;
		fill: #ffe8a3;
	}

	.windows rect:nth-child(3n) {
		animation-delay: 0.9s;
		fill: #87baff;
		opacity: 0.4;
	}

	.boot-brand {
		position: relative;
		z-index: 2;
		width: min(420px, calc(100% - 40px));
		margin: 0 20px max(48px, env(safe-area-inset-bottom, 0px) + 36px);
		text-align: center;
		animation: brand-in 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both;
	}

	.kicker {
		margin: 0 0 8px;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: rgba(240, 180, 41, 0.92);
	}

	h1 {
		margin: 0;
		font-size: clamp(2.4rem, 8vw, 3.4rem);
		font-weight: 700;
		letter-spacing: -0.03em;
		line-height: 1;
		color: #f7fafc;
		text-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
	}

	.tag {
		margin: 12px 0 0;
		font-size: 0.98rem;
		font-weight: 500;
		color: rgba(220, 232, 242, 0.78);
	}

	.progress {
		margin: 22px auto 0;
		width: min(220px, 70%);
		height: 3px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.12);
		overflow: hidden;
	}

	.bar {
		display: block;
		height: 100%;
		width: 42%;
		border-radius: inherit;
		background: linear-gradient(90deg, #f0b429, #ffe8a3, #87baff);
		animation: progress-slide 1.35s ease-in-out infinite;
	}

	@keyframes sky-breathe {
		from {
			filter: brightness(0.96);
		}
		to {
			filter: brightness(1.06);
		}
	}

	@keyframes mist-drift {
		from {
			transform: translateX(-2%);
			opacity: 0.7;
		}
		to {
			transform: translateX(3%);
			opacity: 1;
		}
	}

	@keyframes lake-shimmer {
		0% {
			transform: translateX(0) skewX(-18deg);
			opacity: 0.35;
		}
		50% {
			opacity: 0.9;
		}
		100% {
			transform: translateX(280%) skewX(-18deg);
			opacity: 0.25;
		}
	}

	@keyframes skyline-rise {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(36px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}

	@keyframes brand-in {
		from {
			opacity: 0;
			transform: translateY(16px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes window-twinkle {
		0%,
		100% {
			opacity: 0.25;
		}
		50% {
			opacity: 0.85;
		}
	}

	@keyframes progress-slide {
		0% {
			transform: translateX(-120%);
		}
		100% {
			transform: translateX(280%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.boot-sky,
		.boot-mist,
		.shimmer,
		.windows rect,
		.bar {
			animation: none;
		}
		.skyline,
		.boot-brand {
			animation: none;
			opacity: 1;
			transform: none;
		}
		.skyline {
			transform: translateX(-50%);
		}
		.bar {
			width: 70%;
			transform: none;
		}
	}
</style>
