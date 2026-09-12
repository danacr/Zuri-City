import { expect, test, type Page } from '@playwright/test';


async function waitForCity(page: Page) {
	await expect(page.getByRole('application', { name: 'Walkable 3D map of Zürich' })).toBeVisible({
		timeout: 30000
	});
	await expect(page.getByRole('status', { name: 'Loading Züri City' })).toHaveCount(0, {
		timeout: 30000
	});
}

async function openParkingList(page: Page) {
	const desktop = page.getByRole('complementary', { name: 'Desktop map layers' }).getByRole(
		'button',
		{ name: /parking list/i }
	);
	if (await desktop.isVisible().catch(() => false)) {
		await desktop.click({ force: true });
		return;
	}
	await page.getByRole('button', { name: 'Layers' }).click();
	await page.getByRole('button', { name: /parking list/i }).click();
}

test('city map is home and parking list opens from layers', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 });
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.goto('/');
	await waitForCity(page);
	await expect(page.getByRole('link', { name: 'Züri City home' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Walk' }).first()).toBeVisible();
	await expect(page.getByRole('region', { name: 'Parking list' })).toHaveCount(0);
	await openParkingList(page);
	const panel = page.getByRole('region', { name: 'Parking list' });
	await expect(panel).toBeVisible({ timeout: 10000 });
	await expect(panel.getByRole('heading', { name: 'Parking', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Close parking' }).click();
	await expect(page.getByRole('region', { name: 'Parking list' })).toHaveCount(0);
	expect(errors).toEqual([]);
});

test('HTTP network access explains HTTPS requirement before requesting location', async ({
	page
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
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
	await page.getByRole('button', { name: 'Locate me' }).click();
	await expect(page.getByRole('alert').filter({ hasText: 'Location requires HTTPS' })).toBeVisible();
	expect(errors).toEqual([]);
});

test('parking panel search stays available after opening from layers', async ({ page }, testInfo) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	await waitForCity(page);
	await openParkingList(page);
	const panel = page.getByRole('region', { name: 'Parking list' });
	await expect(panel).toBeVisible({ timeout: 10000 });
	const cards = panel.getByRole('article');
	await expect(cards.first()).toBeVisible({ timeout: 20000 });
	const total = await cards.count();
	await panel.getByRole('button', { name: 'Search garages', exact: true }).click();
	await expect(panel.getByRole('searchbox', { name: 'Search garages' })).toBeFocused();
	await panel.getByRole('searchbox', { name: 'Search garages' }).fill('no-matching-garage');
	await expect(panel.getByRole('status')).toContainText('of');
	await panel.getByRole('button', { name: 'Show all', exact: true }).click();
	await expect(cards.first()).toBeVisible();
	expect(total).toBeGreaterThan(0);
	await page.screenshot({ path: testInfo.outputPath('mobile-city-parking.png'), fullPage: false });
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
		true
	);
});

test('denied location shows a retryable error from the city HUD', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.addInitScript(() => {
		Object.defineProperty(navigator, 'geolocation', {
			value: {
				getCurrentPosition: (_success: unknown, failure: (error: { code: number }) => void) =>
					failure({ code: 1 })
			}
		});
	});
	await page.goto('/');
	await page.getByRole('button', { name: 'Locate me' }).click();
	await expect(
		page.getByRole('alert').filter({ hasText: /Location access was denied/i })
	).toBeVisible();
});

test('mobile layers stay compact so the map remains visible', async ({ page }, testInfo) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	const map = page.getByRole('application', { name: 'Walkable 3D map of Zürich' });
	await expect(map).toBeVisible();
	await page.getByRole('button', { name: 'Layers' }).click();
	const sheet = page.getByRole('region', { name: 'Map layers' });
	await expect(sheet).toBeVisible();
	const metrics = await page.evaluate(() => {
		const mapEl = document.querySelector('[role="application"]') as HTMLElement | null;
		const sheetEl = document.querySelector('[aria-label="Map layers"]') as HTMLElement | null;
		if (!mapEl || !sheetEl) return null;
		const mapBox = mapEl.getBoundingClientRect();
		const sheetBox = sheetEl.getBoundingClientRect();
		return {
			mapHeight: mapBox.height,
			sheetHeight: sheetBox.height,
			viewport: window.innerHeight,
			sheetTop: sheetBox.top
		};
	});
	expect(metrics).not.toBeNull();
	expect(metrics!.mapHeight).toBeGreaterThan(metrics!.viewport * 0.7);
	expect(metrics!.sheetHeight).toBeLessThan(metrics!.viewport * 0.4);
	expect(metrics!.sheetTop).toBeGreaterThan(metrics!.viewport * 0.45);
	const attractions = sheet.getByRole('button', { name: /Attractions/ });
	await expect(attractions).toHaveAttribute('aria-pressed', 'true');
	await attractions.click();
	await expect(attractions).not.toHaveAttribute('aria-pressed', 'true');
	await page.screenshot({ path: testInfo.outputPath('mobile-layers-compact.png'), fullPage: false });
});

test('walk mode reveals keyboard hints and layer toggles update aria state', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto('/');
	await waitForCity(page);
	await page.getByRole('button', { name: 'Walk' }).first().click();
	await expect(page.getByText(/WASD or arrows/)).toBeVisible();
	const attractions = page
		.getByRole('complementary', { name: 'Desktop map layers' })
		.getByRole('button', { name: /Attractions/ });
	await expect(attractions).toHaveAttribute('aria-pressed', 'true');
	await attractions.click({ force: true });
	await expect
		.poll(async () => attractions.getAttribute('aria-pressed'), { timeout: 10000 })
		.not.toBe('true');
});

test('parking list uses dark city chrome with no theme switch', async ({ page }, testInfo) => {
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto('/');
	await waitForCity(page);
	await openParkingList(page);
	await expect(page.getByRole('region', { name: 'Parking list' })).toBeVisible();
	await expect(page.getByRole('article').first()).toBeVisible({ timeout: 20000 });
	await expect(page.getByRole('button', { name: /light mode|dark mode/i })).toHaveCount(0);
	await page.screenshot({ path: testInfo.outputPath('city-parking-dark.png'), timeout: 10000 });
});

test('install button provides iPhone instructions and restores focus', async ({ page }) => {
	await page.addInitScript(() =>
		Object.defineProperty(navigator, 'userAgent', { value: 'iPhone Safari' })
	);
	await page.goto('/');
	await expect(page.getByRole('application', { name: 'Walkable 3D map of Zürich' })).toBeVisible();
	const install = page.getByTestId('install-app');
	await install.click();
	await expect(page.locator('#install-instructions[open]')).toContainText(/Home Screen|home screen/i);
	await expect(page.locator('#install-instructions[open]')).toContainText('Safari');
	await page.getByRole('button', { name: 'Got it' }).click();
	await expect(page.locator('#install-instructions[open]')).toHaveCount(0);
	await expect(install).toBeFocused();
});

test('install button invokes the available native install prompt', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('application', { name: 'Walkable 3D map of Zürich' })).toBeVisible();
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
	await page.getByTestId('install-app').click();
	await expect(page.locator('html')).toHaveAttribute('data-install-prompt', 'shown');
	await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
	await expect(page.getByTestId('install-app')).toHaveCount(0);
});

test('home brand resets parking overlay and returns to orbit', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto('/');
	await waitForCity(page);
	await openParkingList(page);
	await expect(page.getByRole('region', { name: 'Parking list' })).toBeVisible({ timeout: 10000 });
	await page.getByRole('button', { name: 'Walk' }).first().click();
	await expect(page.getByRole('button', { name: 'Walk' }).first()).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await page.evaluate(() => {
		const link = document.querySelector('a[aria-label="Züri City home"]') as HTMLAnchorElement | null;
		link?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
	});
	await expect(page.getByRole('region', { name: 'Parking list' })).toHaveCount(0);
	const orbit = page.getByRole('complementary', { name: 'City briefing' }).getByRole('button', {
		name: 'Orbit'
	});
	await expect(orbit).toHaveAttribute('aria-pressed', 'true', { timeout: 10000 });
});

test('server-rendered SEO metadata and crawler endpoints are valid', async ({ page, request }) => {
	await page.goto('/');
	await expect(page).toHaveTitle(/Züri City/);
	await expect(page.locator('head title')).toHaveCount(1);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /zuri\.city/);
	const schema = JSON.parse(
		(await page.locator('script[type="application/ld+json"]').textContent()) || '{}'
	);
	expect(schema['@graph'][0]['@type']).toBe('WebSite');
	expect(schema['@graph'][0].name).toBe('Züri City');
	expect(schema['@graph'][1].author.url).toBe('https://dan.cv');
	expect((await request.get('/robots.txt')).ok()).toBe(true);
	const sitemap = await request.get('/sitemap.xml');
	expect(sitemap.ok()).toBe(true);
	expect(await sitemap.text()).toContain('<urlset');
});
