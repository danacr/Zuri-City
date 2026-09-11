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
	await expect(page.getByRole('table')).toBeVisible();
	expect(errors).toEqual([]);
});

test('location mode requests permission and can return to the list', async ({ page, context }) => {
	await context.grantPermissions(['geolocation']);
	await context.setGeolocation({ latitude: 47.3769, longitude: 8.5417 });
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Züri City Parking Spots' })).toBeVisible();
	await page.getByRole('button', { name: 'Near me' }).click();
	await expect(page.getByRole('heading', { name: 'Nearest parking garages' })).toBeVisible();
	await expect(page.locator('.leaflet-container')).toBeVisible();
	await page.getByRole('button', { name: 'List view' }).click();
	await expect(page.getByRole('table')).toBeVisible();
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
	await expect(page.getByRole('button', { name: 'Near me' })).toBeEnabled();
});
