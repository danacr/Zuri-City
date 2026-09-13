// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types
declare namespace App {
	// interface Locals {}
	// interface PageData {}
	// interface Error {}
	// interface Platform {}
}

declare module 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url' {
	const workerUrl: string;
	export default workerUrl;
}
