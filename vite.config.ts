import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import cesium from 'vite-plugin-cesium';
import { localHttps } from './config/https.ts';

export default defineConfig(({ command, mode }) => {
	const https = command === 'serve' && mode !== 'test' ? localHttps() : undefined;
	return {
		plugins: [tailwindcss(), sveltekit(), cesium()],
		ssr: {
			noExternal: ['cesium']
		},
		optimizeDeps: {
			include: ['cesium']
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
