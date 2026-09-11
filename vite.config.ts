import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { localHttps } from './config/https.ts';

export default defineConfig(({ command, mode }) => {
	const https = command === 'serve' && mode !== 'test' ? localHttps() : undefined;
	return {
		plugins: [tailwindcss(), sveltekit()],
		server: {
			https,
			// Keep local HTTPS on HTTP/1.1 for consistent browser and test behavior.
			proxy: {},
			fs: { deny: ['.env', '.env.*', '*.{crt,pem,key}', '**/.git/**', '**/.certs/**'] }
		},
		preview: { https, proxy: {} },
		test: { include: ['src/**/*.{test,spec}.{js,ts}'] }
	};
});
