<script lang="ts">
	import { onMount } from 'svelte';

	let dark = false;
	let preference: string | null = null;

	function applyTheme() {
		document.documentElement.dataset.theme = dark ? 'dark' : 'light';
		document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
			meta.setAttribute('content', dark ? '#0c1522' : '#f6f8fc');
		});
	}

	onMount(() => {
		const system = window.matchMedia('(prefers-color-scheme: dark)');
		try {
			preference = localStorage.getItem('theme');
		} catch {
			/* Storage may be unavailable. */
		}
		if (preference !== 'dark' && preference !== 'light') preference = null;
		const update = () => {
			dark = preference ? preference === 'dark' : system.matches;
			applyTheme();
		};
		update();
		system.addEventListener('change', update);
		return () => system.removeEventListener('change', update);
	});

	function toggle() {
		dark = !dark;
		preference = dark ? 'dark' : 'light';
		applyTheme();
		try {
			localStorage.setItem('theme', preference);
		} catch {
			/* Keep the current session theme. */
		}
	}
</script>

<button
	type="button"
	aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
	title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
	on:click={toggle}
>
	<svg
		width="20"
		height="20"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="1.8"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		{#if dark}
			<circle cx="12" cy="12" r="4" />
			<path
				d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"
			/>
		{:else}
			<path d="M20.9 13a9 9 0 0 1-9.9-9.9A9 9 0 1 0 20.9 13Z" />
		{/if}
	</svg>
</button>

<style>
	button {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		color: var(--accent);
		border-radius: 12px;
	}
</style>
