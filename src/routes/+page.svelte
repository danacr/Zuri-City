<script lang="ts">
	import type { PageData } from './$types';
	import { Table } from '@skeletonlabs/skeleton';
	import type { TableSource } from '@skeletonlabs/skeleton';
	import { tableMapperValues } from '@skeletonlabs/skeleton';

	export let data: PageData;

	const tableSimple: TableSource = {
		// A list of heading labels.
		head: ['Parking', 'Status'],
		// The data visibly shown in your table body UI.
		body: tableMapperValues(data.props.openParkings, ['title', 'content'])
	};
</script>

<div class="overflow-auto absolute inset-x-2 h-full justify-center items-center">
	<div class="flex justify-center space-x-2">
		<h2 class="font-bold">Zurich Parking Spots</h2>
	</div>
	<br>

	<div class="flex justify-center space-x-2">
		<p>Click on the parking to start navigation</p>
	</div>

	<div class="flex justify-center space-x-2">
		<p>and on the status for more details.</p>
	</div>
	<div style="text-decoration:none" class="flex justify-center space-x-2">
		<p>Data: <a href="https://www.pls-zh.ch/">pls-zh.ch</a>, <a href="https://github.com/danacr/zuri-parking">GitHub</a> </p>
	</div>

	<div class="flex justify-center space-x-2">
		<p>Designed for mobile</p>
	</div>
	<br>


	<div class="space-y-2">
		<!-- feed title -->
		<!-- <p>{data.props.feed.title}</p> -->
		<Table source={tableSimple} />
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
