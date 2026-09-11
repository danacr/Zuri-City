import type { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
	webServer: {
		command: 'npm run build && npm run preview',
		url: 'https://localhost:4173',
		ignoreHTTPSErrors: true
	},
	testDir: 'tests',
	testMatch: '**/*.ts',
	use: { baseURL: 'https://localhost:4173', ignoreHTTPSErrors: true }
};

export default config;
