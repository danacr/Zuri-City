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
	'minor',
	'service'
] as const;

const trafficClassFilter: ExpressionSpecification = [
	'all',
	['in', ['get', 'class'], ['literal', [...TRAFFIC_CLASSES]]],
	['!=', ['get', 'brunnel'], 'tunnel']
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
	'#2f9e44',
	1,
	'#f08c00',
	'#e03131'
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
			2.2 * scale,
			'trunk',
			2.0 * scale,
			'primary',
			1.7 * scale,
			'secondary',
			1.4 * scale,
			'tertiary',
			1.2 * scale,
			'minor',
			0.9 * scale,
			0.7 * scale
		],
		15,
		[
			'match',
			['get', 'class'],
			'motorway',
			4.2 * scale,
			'trunk',
			3.6 * scale,
			'primary',
			3.0 * scale,
			'secondary',
			2.4 * scale,
			'tertiary',
			2.0 * scale,
			'minor',
			1.5 * scale,
			1.1 * scale
		],
		CITY_MAX_ZOOM,
		[
			'match',
			['get', 'class'],
			'motorway',
			6.0 * scale,
			'trunk',
			5.2 * scale,
			'primary',
			4.4 * scale,
			'secondary',
			3.4 * scale,
			'tertiary',
			2.8 * scale,
			'minor',
			2.0 * scale,
			1.5 * scale
		]
	];
}

/**
 * MapLibre-first Zürich basemap.
 * SWISSIMAGE + ghost OSM massing + OMT traffic centerlines.
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
				url: 'https://tiles.openfreemap.org/planet',
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
					'raster-contrast': 0.06
				}
			},
			/**
			 * Ghost massing — desaturated façades + partial opacity so aerial roofs
			 * remain the primary surface. Pitch/zoom only changes camera, not systems.
			 */
			{
				id: 'osm-buildings-3d',
				type: 'fill-extrusion',
				source: 'openmaptiles',
				'source-layer': 'building',
				minzoom: 14,
				maxzoom: CITY_MAX_ZOOM + 1,
				filter: ['!=', ['get', 'hide_3d'], true],
				paint: {
					'fill-extrusion-color': [
						'interpolate',
						['linear'],
						['coalesce', ['get', 'render_height'], ['get', 'height'], 16],
						0,
						'#5a6570',
						16,
						'#4a545e',
						32,
						'#3a434c',
						64,
						'#2c343c'
					],
					'fill-extrusion-height': [
						'coalesce',
						['get', 'render_height'],
						['get', 'height'],
						16
					],
					'fill-extrusion-base': [
						'coalesce',
						['get', 'render_min_height'],
						['get', 'min_height'],
						0
					],
					'fill-extrusion-opacity': [
						'interpolate',
						['linear'],
						['zoom'],
						14,
						0.28,
						15.5,
						0.42,
						17,
						0.55
					],
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
					'line-opacity': 0.38,
					'line-width': trafficWidth(1.35)
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
						'match',
						['get', 'class'],
						'minor',
						0.72,
						'service',
						0.55,
						0.88
					],
					'line-width': trafficWidth(1)
				}
			},
			{
				/** Static dash accent — no per-frame dasharray RAF. */
				id: 'traffic-pulse',
				type: 'line',
				source: 'openmaptiles',
				'source-layer': 'transportation',
				minzoom: CITY_MIN_ZOOM,
				maxzoom: CITY_MAX_ZOOM + 1,
				filter: [
					'all',
					[
						'in',
						['get', 'class'],
						['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary']]
					],
					['!=', ['get', 'brunnel'], 'tunnel']
				],
				layout: {
					'line-cap': 'butt',
					'line-join': 'round',
					visibility: 'visible'
				},
				paint: {
					'line-color': '#ffffff',
					'line-opacity': 0.22,
					'line-width': trafficWidth(0.45),
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
