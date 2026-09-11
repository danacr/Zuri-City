import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import svelteConfig from './svelte.config.js';

export default [
	{
		ignores: [
			'node_modules/**',
			'.svelte-kit/**',
			'.vercel/**',
			'.certs/**',
			'build/**',
			'test-results/**',
			'playwright-report/**'
		]
	},
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{ languageOptions: { globals: { ...globals.browser, ...globals.node } } },
	{
		files: ['**/*.svelte'],
		languageOptions: { parserOptions: { parser: ts.parser, svelteConfig } },
		rules: { 'svelte/no-at-html-tags': 'off' }
	}
];
