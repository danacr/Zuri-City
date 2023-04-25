<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>
<div class="container h-full mx-auto flex justify-center items-center">
	<div class="space-y-10 text-center">
		<h2 class="font-bold">Welcome to Skeleton.</h2>
		<!-- Animated Logo -->
		<figure>
			<section class="img-bg" />
			<div class="flex justify-center space-x-2">
				<a class="btn btn-filled" href="https://skeleton.dev/" target="_blank" rel="noreferrer">
					Launch Documentation
				</a>
			</div>
			<div class="space-y-2">
				<h1>{data.props.feed.title}</h1>
				{#each Object.entries(data.props.feed.items) as [id, item]}
					<p>{item.title}</p>
					<p>{item.content}</p>
				{/each}
				<p>Try editing the following:</p>
				<p><code>/src/routes/+layout.svelte</code></p>
				<p><code>/src/routes/+page.svelte</code></p>
			</div>
		</figure>
	</div>
</div>

<style lang="postcss">
	:global(body) {
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	:global(body > section) {
		min-height: 200px;
	}
	figure {
		@apply flex relative flex-col;
	}
	figure svg,
	.img-bg {
		@apply w-64 h-64 md:w-80 md:h-80;
	}
	.img-bg {
		@apply absolute z-[-1] rounded-full blur-[50px] transition-all;
		animation: pulse 5s cubic-bezier(0, 0, 0, 0.5) infinite, glow 5s linear infinite;
	}
	@keyframes glow {
		0% {
			@apply bg-primary-400/50;
		}
		33% {
			@apply bg-secondary-400/50;
		}
		66% {
			@apply bg-tertiary-400/50;
		}
		100% {
			@apply bg-primary-400/50;
		}
	}
	@keyframes pulse {
		50% {
			transform: scale(1.5);
		}
	}
</style>
