import type { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
	webServer: {
		command: 'npm run build && npm run preview',
		url: 'https://localhost:4173',
		ignoreHTTPSErrors: true
	},
	testDir: 'tests',
	testMatch: '**/*.ts',
	use: {
		baseURL: 'https://localhost:4173',
		ignoreHTTPSErrors: true,
		channel: process.env.PLAYWRIGHT_CHANNEL || undefined
	}
};

export default config;
