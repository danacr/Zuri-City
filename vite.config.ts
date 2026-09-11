import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { localHttps } from './config/https';

export default defineConfig(({ command, mode }) => {
	const https = command === 'serve' && mode !== 'test' ? localHttps() : undefined;
	return {
		plugins: [sveltekit()],
		server: {
			https,
			// Use HTTPS over HTTP/1.1: this SvelteKit version rejects HTTP/2 request bodies.
			proxy: {},
			fs: { deny: ['.env', '.env.*', '*.{crt,pem,key}', '**/.git/**', '**/.certs/**'] }
		},
		preview: { https, proxy: {} },
		test: { include: ['src/**/*.{test,spec}.{js,ts}'] }
	};
});
