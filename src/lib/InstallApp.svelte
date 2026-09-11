<script lang="ts">
	import { onMount } from 'svelte';
	export let labeled = false;
	type InstallEvent = Event & {
		prompt: () => Promise<void>;
		userChoice: Promise<{ outcome: string }>;
	};
	let promptEvent: InstallEvent | null = null;
	let installed = false;
	let installing = false;
	let ios = false;
	let dialog: HTMLDialogElement;
	onMount(() => {
		const standalone = window.matchMedia('(display-mode: standalone)');
		ios =
			/iPad|iPhone|iPod/.test(navigator.userAgent) ||
			(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
		installed =
			standalone.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
		const capture = (event: Event) => {
			event.preventDefault();
			promptEvent = event as InstallEvent;
		};
		const complete = () => {
			installed = true;
			promptEvent = null;
			dialog.close();
		};
		const changed = () => {
			installed = standalone.matches;
		};
		window.addEventListener('beforeinstallprompt', capture);
		window.addEventListener('appinstalled', complete);
		standalone.addEventListener('change', changed);
		return () => {
			window.removeEventListener('beforeinstallprompt', capture);
			window.removeEventListener('appinstalled', complete);
			standalone.removeEventListener('change', changed);
		};
	});
	async function install() {
		if (!promptEvent) {
			dialog.showModal();
			return;
		}
		installing = true;
		const event = promptEvent;
		promptEvent = null;
		try {
			await event.prompt();
			await event.userChoice;
		} catch {
			dialog.showModal();
		} finally {
			installing = false;
		}
	}
</script>

{#if !installed}<button
		class="install"
		class:labeled
		aria-label="Install web app"
		title="Install web app"
		disabled={installing}
		on:click={install}
		><svg
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.8"
			aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 15v5h14v-5" /></svg
		>{#if labeled}<span>Install web app</span>{/if}</button
	>{/if}
<dialog bind:this={dialog} aria-labelledby="install-title">
	<div class="heading">
		<img src="/favicon.svg" alt="" width="40" height="40" /><button
			aria-label="Close install instructions"
			on:click={() => dialog.close()}>×</button
		>
	</div>
	<h2 id="install-title">Züri Parking, one tap away.</h2>
	<p>Add the web app to your Home Screen for quick access to garages and directions.</p>
	{#if ios}<ol>
			<li>Open this page in <strong>Safari</strong>.</li>
			<li>Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.</li>
			<li>
				Keep <strong>Open as Web App</strong> enabled if shown, then tap <strong>Add</strong>.
			</li>
		</ol>
	{:else}<p>
			Open your browser’s menu and choose <strong>Install app</strong> or
			<strong>Add to Home Screen</strong>. On Mac Safari, choose
			<strong>File → Add to Dock</strong>.
		</p>
		<p>If no install option appears, bookmark this page or try a supported browser.</p>{/if}
	<p class="note">An internet connection is needed for current parking data.</p>
	<button class="done" on:click={() => dialog.close()}>Got it</button>
</dialog>

<style>
	.install.labeled {
		width: auto;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 14px;
		font-size: 13px;
		font-weight: 650;
	}
	.install {
		width: 44px;
		height: 44px;
		display: grid;
		place-items: center;
		color: var(--accent);
		border-radius: 12px;
		background: var(--accent-soft);
	}
	dialog {
		color: var(--text);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 22px;
		padding: 24px;
		width: calc(100% - 32px);
		max-width: 420px;
		max-height: 85vh;
		margin: auto;
		box-shadow: 0 20px 80px #0005;
	}
	dialog::backdrop {
		background: #07142699;
		backdrop-filter: blur(4px);
	}
	.heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.heading button {
		width: 44px;
		height: 44px;
		font-size: 28px;
		color: var(--muted);
	}
	h2 {
		margin: 18px 0 12px;
		font-size: 23px;
		font-weight: 750;
		line-height: 1.25;
	}
	p,
	ol {
		margin: 12px 0;
		font-size: 14px;
		line-height: 1.6;
		color: var(--muted);
	}
	ol {
		list-style: decimal;
		padding-left: 20px;
	}
	li {
		margin: 8px 0;
	}
	strong {
		color: var(--text);
	}
	.note {
		font-size: 12px;
	}
	.done {
		background: var(--accent-button);
		color: white;
		min-height: 48px;
		border-radius: 12px;
		width: 100%;
		font-weight: 700;
		margin-top: 8px;
	}
</style>
