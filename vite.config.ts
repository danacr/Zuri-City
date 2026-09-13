import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { localHttps } from './config/https.ts';

/**
 * Cesium Workers/Assets are copied into `static/cesiumStatic` by
 * `scripts/copy-cesium-assets.mjs` (predev/prebuild) so SvelteKit/Vercel
 * serve them at `/cesiumStatic/...`.
 */
export default defineConfig(({ command, mode }) => {
	const https = command === 'serve' && mode !== 'test' ? localHttps() : undefined;
	return {
		plugins: [tailwindcss(), sveltekit()],
		define: {
			CESIUM_BASE_URL: JSON.stringify('/cesiumStatic/')
		},
		ssr: {
			noExternal: ['cesium']
		},
		optimizeDeps: {
			include: ['cesium']
		},
		build: {
			chunkSizeWarningLimit: 5000
		},
		server: {
			https,
			proxy: {},
			fs: { deny: ['.env', '.env.*', '*.{crt,pem,key}', '**/.git/**', '**/.certs/**'] }
		},
		preview: { https, proxy: {} },
		test: { include: ['src/**/*.{test,spec}.{js,ts}'] }
	};
});
