import { describe, expect, it } from 'vitest';
import { zurichAerialStyle, TRAFFIC_STYLE_LAYERS } from './aerialStyle';
import {
	ORBIT_CAMERA,
	WALK_CAMERA,
	SWISS_BUILDINGS_ENABLED,
	CITY_MIN_ZOOM,
	CITY_MAX_ZOOM
} from './swissSources';

describe('zurichAerialStyle — product acceptance contracts', () => {
	const style = zurichAerialStyle();

	it('includes SWISSIMAGE aerial + OpenMapTiles vector sources', () => {
		expect(style.sources.aerial?.type).toBe('raster');
		expect(style.sources.openmaptiles?.type).toBe('vector');
	});

	it('ships solid OSM building massing (not translucent ghosts)', () => {
		const buildings = style.layers.find((layer) => layer.id === 'osm-buildings-3d');
		expect(buildings).toBeDefined();
		expect(buildings?.type).toBe('fill-extrusion');
		expect(buildings?.minzoom ?? 0).toBeLessThanOrEqual(13);
		const opacity = (buildings as { paint?: Record<string, unknown> }).paint?.[
			'fill-extrusion-opacity'
		];
		expect(opacity).toBeDefined();
		const numbers =
			JSON.stringify(opacity)
				.match(/-?\d+(?:\.\d+)?/g)
				?.map(Number)
				.filter((n) => n > 0 && n <= 1) ?? [];
		expect(Math.max(...numbers)).toBeGreaterThanOrEqual(0.85);
		expect(Math.max(...numbers)).toBeGreaterThan(0.55);
	});

	it('keeps congestion traffic layers on OMT transportation centerlines', () => {
		for (const id of TRAFFIC_STYLE_LAYERS) {
			const layer = style.layers.find((item) => item.id === id);
			expect(layer, id).toBeDefined();
			expect(layer?.type).toBe('line');
			expect((layer as { 'source-layer'?: string })['source-layer']).toBe('transportation');
		}
		const omt = style.sources.openmaptiles as { maxzoom?: number };
		expect(omt.maxzoom).toBe(14);
		const flow = style.layers.find((item) => item.id === 'traffic-flow') as {
			filter?: unknown[];
			paint?: Record<string, unknown>;
		};
		expect(JSON.stringify(flow.filter)).toContain('ramp');
		// Zoom must only feed top-level interpolate — never nest inside `*`.
		const opacity = JSON.stringify(flow.paint?.['line-opacity']);
		expect(opacity).toContain('interpolate');
		expect(opacity).not.toMatch(/\["\*",/);
	});

	it('stays within the city zoom contract', () => {
		expect(CITY_MIN_ZOOM).toBeLessThan(CITY_MAX_ZOOM);
		expect(CITY_MIN_ZOOM).toBeGreaterThanOrEqual(10);
		expect(CITY_MAX_ZOOM).toBeLessThanOrEqual(20);
	});
});

describe('orbit vs walk camera contract', () => {
	it('differentiates orbit (basin) from walk (street immersion)', () => {
		expect(WALK_CAMERA.zoom).toBeGreaterThan(ORBIT_CAMERA.zoom);
		expect(WALK_CAMERA.pitch).toBeGreaterThan(ORBIT_CAMERA.pitch);
		expect(WALK_CAMERA.minPitch).toBeGreaterThan(40);
		expect(WALK_CAMERA.maxPitch).toBeGreaterThan(WALK_CAMERA.minPitch);
	});

	it('enables swissBUILDINGS3D by default (soft-fails to OSM extrusions)', () => {
		expect(SWISS_BUILDINGS_ENABLED).toBe(true);
	});
});
