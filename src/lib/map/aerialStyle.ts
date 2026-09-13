import type { ExpressionSpecification, StyleSpecification } from 'maplibre-gl';
import { CITY_MAX_ZOOM, CITY_MIN_ZOOM, SWISSIMAGE_TILES } from './swissSources';

/**
 * Major + local OMT transportation classes so congestion strokes sit on the
 * same centerlines users see in the aerial (not a sparse arterial-only graph).
 */
const TRAFFIC_CLASSES = [
	'motorway',
	'trunk',
	'primary',
	'secondary',
	'tertiary',
	'minor'
] as const;

const trafficClassFilter: ExpressionSpecification = [
	'all',
	['in', ['get', 'class'], ['literal', [...TRAFFIC_CLASSES]]],
	['!=', ['get', 'brunnel'], 'tunnel'],
	// Ramps generalize poorly when OMT (maxzoom 14) is overzoomed onto SWISSIMAGE.
	['!=', ['coalesce', ['get', 'ramp'], 0], 1]
];

/** Fade modeled strokes past z15 — overzoomed OMT centerlines drift vs aerial. */
const trafficFadeOpacity: ExpressionSpecification = [
	'interpolate',
	['linear'],
	['zoom'],
	13,
	0.9,
	14.5,
	0.82,
	15.5,
	0.45,
	16.5,
	0.18,
	17.5,
	0.08
];

/** Pseudo congestion from stable road identity (ref/name/class) — green / amber / red. */
const congestionColor: ExpressionSpecification = [
	'match',
	[
		'%',
		[
			'+',
			[
				'match',
				['get', 'class'],
				'motorway',
				0,
				'trunk',
				1,
				'primary',
				2,
				'secondary',
				3,
				'tertiary',
				4,
				'minor',
				5,
				6
			],
			['length', ['coalesce', ['get', 'ref'], '']],
			['length', ['coalesce', ['get', 'name'], ['get', 'name:en'], 'rd']]
		],
		3
	],
	0,
	'#6f8f72',
	1,
	'#b08a4a',
	'#a35a5a'
];

/**
 * Class-aware centerline width — thin enough to read as streets on SWISSIMAGE,
 * not floating corridors. Majors stay slightly thicker than local streets.
 */
function trafficWidth(scale: number): ExpressionSpecification {
	return [
		'interpolate',
		['linear'],
		['zoom'],
		CITY_MIN_ZOOM,
		[
			'match',
			['get', 'class'],
			'motorway',
			1.6 * scale,
			'trunk',
			1.45 * scale,
			'primary',
			1.25 * scale,
			'secondary',
			1.05 * scale,
			'tertiary',
			0.9 * scale,
			'minor',
			0.7 * scale,
			0.55 * scale
		],
		14.5,
		[
			'match',
			['get', 'class'],
			'motorway',
			2.8 * scale,
			'trunk',
			2.4 * scale,
			'primary',
			2.0 * scale,
			'secondary',
			1.6 * scale,
			'tertiary',
			1.35 * scale,
			'minor',
			1.05 * scale,
			0.85 * scale
		],
		16,
		[
			'match',
			['get', 'class'],
			'motorway',
			3.2 * scale,
			'trunk',
			2.8 * scale,
			'primary',
			2.3 * scale,
			'secondary',
			1.8 * scale,
			'tertiary',
			1.5 * scale,
			'minor',
			1.15 * scale,
			0.9 * scale
		]
	];
}

/**
 * MapLibre-first Zürich basemap.
 * SWISSIMAGE + solid OSM massing + OMT traffic centerlines.
 * swissBUILDINGS3D is phase-2 (feature-flagged), not part of this style.
 */
export function zurichAerialStyle(): StyleSpecification {
	return {
		version: 8,
		name: 'zuri-maplibre-pro',
		glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
		sources: {
			aerial: {
				type: 'raster',
				tiles: [SWISSIMAGE_TILES],
				tileSize: 256,
				minzoom: 0,
				maxzoom: 19,
				attribution: '© swisstopo — SWISSIMAGE'
			},
			openmaptiles: {
				type: 'vector',
				// TileJSON already caps at 14 — keep url so planet snapshots rotate.
				// Explicit maxzoom documents the overzoom contract vs SWISSIMAGE z19.
				url: 'https://tiles.openfreemap.org/planet',
				maxzoom: 14,
				attribution: '© OpenMapTiles © OpenStreetMap'
			}
		},
		layers: [
			{
				id: 'satellite',
				type: 'raster',
				source: 'aerial',
				paint: {
					'raster-opacity': 1,
					'raster-saturation': -0.04,
					'raster-contrast': 0.06,
					'raster-fade-duration': 300
				}
			},
			/**
			 * Solid city massing — opaque enough to read as real volume on terrain.
			 * Warm stone façades sit with SWISSIMAGE; roofs stay secondary to extrusion.
			 * Never ship translucent "ghost" boxes that look like flat aerial.
			 */
			{
				id: 'osm-buildings-3d',
				type: 'fill-extrusion',
				source: 'openmaptiles',
				'source-layer': 'building',
				minzoom: 13,
				maxzoom: CITY_MAX_ZOOM + 1,
				filter: ['!=', ['get', 'hide_3d'], true],
				paint: {
					'fill-extrusion-color': [
						'interpolate',
						['linear'],
						['coalesce', ['get', 'render_height'], ['get', 'height'], 16],
						0,
						'#c4b8a4',
						12,
						'#a89882',
						28,
						'#8a7a66',
						55,
						'#6b5d4c',
						90,
						'#4a4036'
					],
					'fill-extrusion-height': [
						'coalesce',
						['get', 'render_height'],
						['get', 'height'],
						18
					],
					'fill-extrusion-base': [
						'coalesce',
						['get', 'render_min_height'],
						['get', 'min_height'],
						0
					],
					/** Solid from first orbit paint — never ghost into SWISSIMAGE. */
					'fill-extrusion-opacity': 0.95,
					'fill-extrusion-vertical-gradient': true
				}
			},
			{
				id: 'traffic-case',
				type: 'line',
				source: 'openmaptiles',
				'source-layer': 'transportation',
				minzoom: CITY_MIN_ZOOM,
				maxzoom: CITY_MAX_ZOOM + 1,
				filter: trafficClassFilter,
				layout: {
					'line-cap': 'round',
					'line-join': 'round',
					visibility: 'visible'
				},
				paint: {
					'line-color': '#0a121c',
					'line-opacity': [
						'*',
						0.32,
						trafficFadeOpacity
					],
					'line-width': trafficWidth(0.72)
				}
			},
			{
				id: 'traffic-flow',
				type: 'line',
				source: 'openmaptiles',
				'source-layer': 'transportation',
				minzoom: CITY_MIN_ZOOM,
				maxzoom: CITY_MAX_ZOOM + 1,
				filter: trafficClassFilter,
				layout: {
					'line-cap': 'round',
					'line-join': 'round',
					visibility: 'visible'
				},
				paint: {
					'line-color': congestionColor,
					'line-opacity': [
						'*',
						[
							'match',
							['get', 'class'],
							'minor',
							0.78,
							'service',
							0.55,
							0.95
						],
						trafficFadeOpacity
					],
					'line-width': trafficWidth(0.55)
				}
			},
			{
				/** Static dash accent — no per-frame dasharray RAF. */
				id: 'traffic-pulse',
				type: 'line',
				source: 'openmaptiles',
				'source-layer': 'transportation',
				minzoom: CITY_MIN_ZOOM,
				maxzoom: 15.5,
				filter: [
					'all',
					[
						'in',
						['get', 'class'],
						['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary']]
					],
					['!=', ['get', 'brunnel'], 'tunnel'],
					['!=', ['coalesce', ['get', 'ramp'], 0], 1]
				],
				layout: {
					'line-cap': 'butt',
					'line-join': 'round',
					visibility: 'visible'
				},
				paint: {
					'line-color': '#ffffff',
					'line-opacity': ['*', 0.2, trafficFadeOpacity],
					'line-width': trafficWidth(0.28),
					'line-dasharray': [1.2, 3.6]
				}
			},
			{
				id: 'place-label',
				type: 'symbol',
				source: 'openmaptiles',
				'source-layer': 'place',
				minzoom: CITY_MIN_ZOOM,
				filter: ['in', ['get', 'class'], ['literal', ['suburb', 'neighbourhood', 'quarter']]],
				layout: {
					'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
					'text-font': ['Noto Sans Regular'],
					'text-size': [
						'interpolate',
						['linear'],
						['zoom'],
						CITY_MIN_ZOOM,
						11,
						CITY_MAX_ZOOM,
						14
					],
					'text-padding': 8
				},
				paint: {
					'text-color': '#f7f2ea',
					'text-halo-color': '#0b1724',
					'text-halo-width': 1.4
				}
			},
			{
				id: 'road-label',
				type: 'symbol',
				source: 'openmaptiles',
				'source-layer': 'transportation_name',
				minzoom: 14,
				layout: {
					'symbol-placement': 'line',
					'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
					'text-font': ['Noto Sans Regular'],
					'text-size': [
						'interpolate',
						['linear'],
						['zoom'],
						14,
						10,
						CITY_MAX_ZOOM,
						12
					],
					'text-max-angle': 30
				},
				paint: {
					'text-color': '#fff8ef',
					'text-halo-color': '#142033',
					'text-halo-width': 1.2
				}
			}
		]
	};
}

export const TRAFFIC_STYLE_LAYERS = ['traffic-case', 'traffic-flow', 'traffic-pulse'] as const;
