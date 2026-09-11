import { expect, test } from '@playwright/test';

test('HTTP network access explains HTTPS requirement before requesting location', async ({
	page
}) => {
	await page.addInitScript(() => {
		Object.defineProperty(window, 'isSecureContext', { value: false });
		Object.defineProperty(navigator, 'geolocation', {
			value: {
				getCurrentPosition: () => {
					throw new Error('Must not request location over HTTP');
				}
			}
		});
	});
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.goto('/');
	await page.getByRole('button', { name: 'Near me' }).click();
	await expect(
		page.getByRole('alert').filter({ hasText: 'Location requires HTTPS' })
	).toBeVisible();
	await page.getByRole('button', { name: 'List view' }).click();
	await expect(page.getByRole('region', { name: 'Parking garages', exact: true })).toBeVisible();
	expect(errors).toEqual([]);
});

test('location mode requests permission and can return to the list', async ({
	page,
	context
}, testInfo) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await context.grantPermissions(['geolocation']);
	await context.setGeolocation({ latitude: 47.3769, longitude: 8.5417 });
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Züri Parking', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Near me' }).click();
	await expect(page.getByRole('region', { name: 'Parking map', exact: true })).toBeVisible();
	await expect(page.locator('.leaflet-container')).toBeVisible();
	await expect(page.locator('.parking-marker strong').first()).toHaveText(/(\d+|—) \/ (\d+|—)/);
	await page.locator('.map-section').screenshot({ path: testInfo.outputPath('mobile-map.png') });
	await page.emulateMedia({ colorScheme: 'light' });
	await page.getByRole('button', { name: 'Switch to dark mode' }).click();
	await expect(page.locator('.leaflet-tile-pane')).not.toHaveCSS('filter', 'none');
	await expect(page.locator('.parking-marker').first()).toHaveCSS('color', /rgb/);
	await page.locator('.parking-marker').first().click();
	await expect(page.locator('.leaflet-popup-content-wrapper')).toHaveCSS(
		'background-color',
		'rgb(21, 34, 53)'
	);
	await expect(page.locator('.leaflet-popup-content-wrapper')).toHaveCSS(
		'color',
		'rgb(236, 242, 250)'
	);
	await page.getByRole('button', { name: 'Switch to light mode' }).click();
	await expect(page.locator('.leaflet-tile-pane')).toHaveCSS('filter', 'none');
	await expect(page.locator('.leaflet-popup-content-wrapper')).toHaveCSS(
		'background-color',
		'rgb(255, 255, 255)'
	);

	await page.getByRole('button', { name: 'List view' }).click();
	await expect(page.getByRole('region', { name: 'Parking garages', exact: true })).toBeVisible();
});

test('denied location shows a retryable error', async ({ page }) => {
	await page.addInitScript(() => {
		Object.defineProperty(navigator, 'geolocation', {
			value: {
				getCurrentPosition: (_success: unknown, failure: (error: { code: number }) => void) =>
					failure({ code: 1 })
			}
		});
	});
	await page.goto('/');
	await page.getByRole('button', { name: 'Near me' }).click();
	await expect(
		page.getByRole('alert').filter({ hasText: 'Location access was denied' })
	).toBeVisible();
	await expect(page.getByRole('button', { name: 'Try location again' })).toBeEnabled();
});

test('mobile cards show free/total counts and disclose filters without overflow', async ({
	page
}, testInfo) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	const cards = page.getByRole('article');
	await expect(cards.first()).toBeVisible();
	const total = await cards.count();
	await expect(cards.first().locator('.spaces')).toContainText(/\d+\s*\/\s*(\d+|—)/);
	await page.screenshot({ path: testInfo.outputPath('mobile-list.png'), fullPage: false });
	await expect(page.getByRole('searchbox', { name: 'Search garages' })).toBeHidden();
	await page.getByRole('button', { name: 'Search garages', exact: true }).click();
	await expect(page.getByRole('searchbox', { name: 'Search garages' })).toBeFocused();
	await page.getByRole('searchbox', { name: 'Search garages' }).fill('no-matching-garage');
	await expect(page.getByRole('status')).toContainText(`${total} hidden by your search`);
	await page.getByRole('button', { name: 'Show all', exact: true }).click();
	await expect(cards).toHaveCount(total);
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
		true
	);
	await page.setViewportSize({ width: 320, height: 740 });
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
		true
	);
});

test('follows phone appearance and collapses search with Escape', async ({ page }, testInfo) => {
	await page.setViewportSize({ width: 320, height: 740 });
	await page.emulateMedia({ colorScheme: 'dark' });
	await page.goto('/');
	await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(12, 21, 34)');
	await expect(page.getByRole('article').first()).toHaveCSS('background-color', 'rgb(21, 34, 53)');
	await page.screenshot({ path: testInfo.outputPath('mobile-dark.png') });
	await page.getByRole('button', { name: 'Search garages', exact: true }).click();
	const search = page.getByRole('searchbox');
	await expect(search).toBeFocused();
	await search.fill('garage');
	await search.press('Escape');
	await expect(search).toBeHidden();
	await expect(page.getByRole('button', { name: 'Search garages', exact: true })).toBeFocused();
	await page.emulateMedia({ colorScheme: 'light' });
	await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(246, 248, 252)');
	await expect(page.getByRole('article').first()).toHaveCSS(
		'background-color',
		'rgb(255, 255, 255)'
	);
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
		true
	);
});

test('install button provides iPhone instructions and restores focus', async ({ page }) => {
	await page.addInitScript(() =>
		Object.defineProperty(navigator, 'userAgent', { value: 'iPhone Safari' })
	);
	await page.goto('/');
	const install = page.getByRole('button', { name: 'Install web app' });
	await install.click();
	await expect(page.getByRole('dialog')).toContainText('Add to Home Screen');
	await expect(page.getByRole('dialog')).toContainText('Safari');
	await page.getByRole('button', { name: 'Got it' }).click();
	await expect(page.getByRole('dialog')).toBeHidden();
	await expect(install).toBeFocused();
});

test('install button invokes the available native install prompt', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Search garages', exact: true }).click();
	await page.evaluate(() => {
		const event = new Event('beforeinstallprompt', { cancelable: true });
		Object.assign(event, {
			prompt: async () => {
				document.documentElement.dataset.installPrompt = 'shown';
			},
			userChoice: Promise.resolve({ outcome: 'accepted' })
		});
		window.dispatchEvent(event);
	});
	await page.getByRole('button', { name: 'Install web app' }).click();
	await expect(page.locator('html')).toHaveAttribute('data-install-prompt', 'shown');
	await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
	await expect(page.getByRole('button', { name: 'Install web app' })).toBeHidden();
});

test('header leads directly into results and secondary information follows the list', async ({
	page
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	await expect(page.locator('header').getByRole('button')).toHaveCount(2);
	await expect(page.getByRole('button', { name: 'Available only' })).toHaveCount(0);
	await expect(page.getByRole('heading', { name: 'All parking garages' })).toHaveCount(0);
	const first = await page.getByRole('article').first().boundingBox();
	const header = await page.locator('header').boundingBox();
	expect(first!.y - (header!.y + header!.height)).toBeLessThanOrEqual(2);
	const last = await page.getByRole('article').last().boundingBox();
	const information = await page.getByRole('region', { name: 'Parking information' }).boundingBox();
	expect(information!.y).toBeGreaterThanOrEqual(last!.y + last!.height);
	await expect(
		page
			.getByRole('region', { name: 'Parking information' })
			.getByRole('button', { name: 'Refresh parking data' })
	).toHaveCount(1);
});

test('home resets map and search, unavailable garages stay below available results', async ({
	page,
	context
}) => {
	await context.grantPermissions(['geolocation']);
	await context.setGeolocation({ latitude: 47.3769, longitude: 8.5417 });
	await page.goto('/');
	await expect(page.getByRole('button', { name: 'Near me' })).toContainText('Map');
	await page.getByRole('button', { name: 'Near me' }).click();
	await expect(page.locator('.leaflet-container')).toBeVisible();
	await page.getByRole('button', { name: 'Search garages', exact: true }).click();
	await page.getByRole('searchbox').fill('Globus');
	await page.getByRole('link', { name: 'Züri City Parking home' }).click();
	await expect(page.getByRole('region', { name: 'Parking garages', exact: true })).toBeVisible();
	await expect(page.getByRole('searchbox')).toBeHidden();
	await expect(page.locator('.results .parking-card.red, .results .parking-card.grey')).toHaveCount(
		0
	);
	await expect(page.locator('.unavailable .parking-card.green')).toHaveCount(0);
	await expect(page.getByRole('region', { name: 'Garage data issues' })).toHaveCount(0);
	const names = await page
		.getByRole('article')
		.evaluateAll((cards) => cards.map((card) => card.getAttribute('aria-label')));
	expect(new Set(names).size).toBe(names.length);
	for (const card of await page.locator('.unavailable .parking-card').all()) {
		await expect(card.getByRole('list', { name: 'Garage issues' })).toBeVisible();
	}
	await expect(page.getByRole('link', { name: 'dan.cv', exact: true })).toHaveAttribute(
		'href',
		'https://dan.cv'
	);
});

test('server-rendered SEO metadata and crawler endpoints are valid', async ({ page, request }) => {
	await page.goto('/');
	await expect(page).toHaveTitle('Parking in Zürich – Free Spaces & Garage Map | Züri Parking');
	await expect(page.locator('head title')).toHaveCount(1);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://zuri.city/');
	const schema = JSON.parse(
		(await page.locator('script[type="application/ld+json"]').textContent()) || '{}'
	);
	expect(schema['@graph'][0]['@type']).toBe('WebSite');
	expect(schema['@graph'][1].author.url).toBe('https://dan.cv');
	expect((await request.get('/robots.txt')).ok()).toBe(true);
	const sitemap = await request.get('/sitemap.xml');
	expect(sitemap.ok()).toBe(true);
	expect(await sitemap.text()).toContain('<urlset');
});
