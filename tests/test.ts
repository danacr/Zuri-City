/**
 * Legacy smoke tests — kept minimal. Full product gates live in acceptance.spec.ts.
 * Prefer `npm run quality` before presenting a preview as ready.
 */
import { expect, test } from '@playwright/test';

test('home responds and exposes the city map landmark', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	await expect(page.getByTestId('zurich-map')).toBeVisible({ timeout: 45_000 });
	await expect(page.getByRole('application', { name: /Walkable 3D map/i })).toBeVisible();
});
