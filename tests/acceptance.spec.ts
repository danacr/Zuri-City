/**
 * Mobile-first acceptance / quality gates for Züri City.
 * These must pass before a preview is presented as ready.
 */
import { expect, test, type Page } from '@playwright/test';

const MOBILE = { width: 390, height: 844 } as const;
const DESKTOP = { width: 1280, height: 800 } as const;

type MapProbe = {
	ready: boolean;
	mode: string | null;
	pitch: number;
	zoom: number;
	hasBuildings: boolean;
	buildingOpacity: number | null;
	hasParkingPill: boolean;
	hasParkingLabel: boolean;
	parkingCount: number;
	parkingSourceFeatures: number;
	hasTrafficFlow: boolean;
	hasPlaceSprites: boolean;
	hasPlaneSprites: boolean;
};

async function waitForMapReady(page: Page) {
	const map = page.getByTestId('zurich-map');
	await expect(map).toBeVisible({ timeout: 45_000 });
	await expect(map).toHaveAttribute('data-map-ready', 'true', { timeout: 60_000 });
	await page.waitForFunction(
		() => {
			const m = (window as unknown as { __zurichMap?: { isStyleLoaded?: () => boolean } })
				.__zurichMap;
			return Boolean(m?.isStyleLoaded?.());
		},
		null,
		{ timeout: 60_000 }
	);
}

async function probeMap(page: Page): Promise<MapProbe> {
	return page.evaluate(() => {
		const el = document.querySelector('[data-testid="zurich-map"]') as HTMLElement | null;
		const map = (window as unknown as { __zurichMap?: any }).__zurichMap;
		const buildingId = 'osm-buildings-3d';
		const buildings = map?.getLayer?.(buildingId);
		let buildingOpacity: number | null = null;
		if (buildings && map?.getPaintProperty) {
			const raw = map.getPaintProperty(buildingId, 'fill-extrusion-opacity');
			if (typeof raw === 'number') buildingOpacity = raw;
			else if (Array.isArray(raw)) {
				const nums = raw.filter((v: unknown) => typeof v === 'number') as number[];
				buildingOpacity = nums.length ? Math.max(...nums) : null;
			}
		}
		let parkingSourceFeatures = 0;
		try {
			parkingSourceFeatures = map?.querySourceFeatures?.('parking')?.length ?? 0;
		} catch {
			parkingSourceFeatures = 0;
		}
		const images = map?.listImages?.() ?? [];
		return {
			ready: el?.dataset.mapReady === 'true',
			mode: el?.dataset.mapMode ?? null,
			pitch: map?.getPitch?.() ?? 0,
			zoom: map?.getZoom?.() ?? 0,
			hasBuildings: Boolean(buildings),
			buildingOpacity,
			hasParkingPill: Boolean(map?.getLayer?.('parking-pill')),
			hasParkingLabel: Boolean(map?.getLayer?.('parking-label')),
			parkingCount: Number(el?.dataset.parkingCount ?? 0),
			parkingSourceFeatures,
			hasTrafficFlow: Boolean(map?.getLayer?.('traffic-flow')),
			hasPlaceSprites: images.some((id: string) => id.startsWith('place-')),
			hasPlaneSprites: images.some((id: string) => id.startsWith('plane-'))
		};
	});
}

test.describe('mobile acceptance gates', () => {
	test.use({ viewport: MOBILE });

	test('map boots with solid buildings, parking pills, traffic, sprites', async ({ page }) => {
		test.setTimeout(120_000);
		const errors: string[] = [];
		page.on('pageerror', (error) => errors.push(error.message));
		await page.goto('/');
		await waitForMapReady(page);

		// Parking arrives via streamed hydrateCity (PLS RSS + garage metadata).
		await expect
			.poll(async () => (await probeMap(page)).parkingCount, { timeout: 90_000 })
			.toBeGreaterThan(0);

		const probe = await probeMap(page);
		expect(probe.ready).toBe(true);
		expect(probe.hasBuildings).toBe(true);
		expect(probe.buildingOpacity ?? 0).toBeGreaterThanOrEqual(0.7);
		expect(probe.hasParkingPill).toBe(true);
		expect(probe.hasParkingLabel).toBe(true);
		expect(probe.hasTrafficFlow).toBe(true);
		expect(probe.hasPlaceSprites).toBe(true);
		expect(probe.hasPlaneSprites).toBe(true);
		expect(errors).toEqual([]);
	});

	test('orbit and walk are distinct (pitch + mode + walk hint)', async ({ page }) => {
		await page.goto('/');
		await waitForMapReady(page);

		const dock = page.getByRole('navigation', { name: 'Map modes' });
		await dock.getByRole('button', { name: 'Orbit', exact: true }).click();
		await expect(page.getByTestId('zurich-map')).toHaveAttribute('data-map-mode', 'orbit');
		const orbit = await probeMap(page);

		await dock.getByRole('button', { name: 'Walk', exact: true }).click();
		await expect(page.getByTestId('zurich-map')).toHaveAttribute('data-map-mode', 'walk');
		await expect(page.getByRole('status').filter({ hasText: /Walk/i })).toBeVisible();
		// Allow camera ease to settle.
		await page.waitForTimeout(1600);
		const walk = await probeMap(page);

		expect(walk.pitch).toBeGreaterThan(orbit.pitch + 8);
		expect(walk.zoom).toBeGreaterThan(orbit.zoom + 1);
	});

	test('cameras stay off by default (no purple-dot first paint)', async ({ page }) => {
		await page.goto('/');
		await waitForMapReady(page);
		await page
			.getByRole('navigation', { name: 'Map modes' })
			.getByRole('button', { name: 'Layers' })
			.click();
		const sheet = page.getByRole('dialog', { name: 'Map layers' });
		await expect(sheet).toBeVisible();
		await expect(sheet.getByRole('button', { name: /^Cameras/i })).toHaveAttribute(
			'aria-pressed',
			'false'
		);
	});

	test('parking is always-on in Layers (cannot be toggled off)', async ({ page }) => {
		await page.goto('/');
		await waitForMapReady(page);
		await page
			.getByRole('navigation', { name: 'Map modes' })
			.getByRole('button', { name: 'Layers' })
			.click();
		const parking = page.getByRole('dialog', { name: 'Map layers' }).getByRole('button', {
			name: /Parking/i
		});
		await expect(parking).toHaveAttribute('aria-pressed', 'true');
		await expect(parking).toHaveAttribute('aria-disabled', 'true');
		// Locked control: click must not flip state (force because aria-disabled).
		await parking.click({ force: true });
		await expect(parking).toHaveAttribute('aria-pressed', 'true');
		expect((await probeMap(page)).hasParkingPill).toBe(true);
	});

	test('mobile layout keeps the map as the primary surface', async ({ page }, testInfo) => {
		await page.goto('/');
		await waitForMapReady(page);
		const metrics = await page.evaluate(() => {
			const map = document.querySelector('[data-testid="zurich-map"]') as HTMLElement | null;
			if (!map) return null;
			const box = map.getBoundingClientRect();
			return {
				height: box.height,
				width: box.width,
				vh: window.innerHeight,
				vw: window.innerWidth
			};
		});
		expect(metrics).not.toBeNull();
		expect(metrics!.height).toBeGreaterThan(metrics!.vh * 0.7);
		expect(metrics!.width).toBeLessThanOrEqual(metrics!.vw + 1);
		await page.screenshot({
			path: testInfo.outputPath('mobile-acceptance.png'),
			fullPage: false
		});
	});
});

test.describe('desktop smoke gate', () => {
	test.use({ viewport: DESKTOP });

	test('SEO shell + map ready without page errors', async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', (error) => errors.push(error.message));
		await page.goto('/');
		await expect(page).toHaveTitle(/Züri|Zuri|Zürich/i, { timeout: 15_000 });
		await waitForMapReady(page);
		await expect(page.getByRole('link', { name: /Züri City home/i })).toBeVisible();
		expect(errors).toEqual([]);
	});
});
