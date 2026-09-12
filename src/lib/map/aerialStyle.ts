import type { StyleSpecification } from 'maplibre-gl';
import { CITY_MAX_ZOOM, CITY_MIN_ZOOM, SWISSIMAGE_TILES } from './swissSources';

/**
 * Continuous swisstopo aerial style for Zürich.
 * Buildings and terrain are attached at runtime (3D Tiles + quantized-mesh).
 * Traffic/labels stay present across the city zoom range — zoom only scales stroke width.
 */
export function zurichAerialStyle(): StyleSpecification {
	return {
		version: 8,
		name: 'zuri-swiss-continuous',
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
					'raster-saturation': -0.02,
					'raster-contrast': 0.08
				}
			},
			/**
			 * Always-on extruded OSM footprints so the city reads as 3D even when
			 * the swisstopo mesh layer fails to attach (WebGL context races).
			 */
			{
				id: 'osm-buildings-3d',
				type: 'fill-extrusion',
				source: 'openmaptiles',
				'source-layer': 'building',
				minzoom: 12,
				maxzoom: CITY_MAX_ZOOM + 1,
				paint: {
					'fill-extrusion-color': [
						'interpolate',
						['linear'],
						['coalesce', ['get', 'render_height'], ['get', 'height'], 12],
						0,
						'#efe6d6',
						20,
						'#d9cfc0',
						45,
						'#c2b7a6',
						80,
						'#a89e8f'
					],
					'fill-extrusion-height': [
						'interpolate',
						['linear'],
						['zoom'],
						12,
						0,
						13,
						['*', ['coalesce', ['get', 'render_height'], ['get', 'height'], 12], 0.7],
						14.5,
						['coalesce', ['get', 'render_height'], ['get', 'height'], 14],
						16,
						['coalesce', ['get', 'render_height'], ['get', 'height'], 14]
					],
					'fill-extrusion-base': [
						'coalesce',
						['get', 'render_min_height'],
						['get', 'min_height'],
						0
					],
					'fill-extrusion-opacity': 0.92,
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
					'line-cap': 'round',
					'line-join': 'round',
					visibility: 'visible'
				},
				paint: {
					'line-color': '#0b1724',
					'line-opacity': 0.45,
					'line-width': [
						'interpolate',
						['linear'],
						['zoom'],
						CITY_MIN_ZOOM,
						2.8,
						15,
						6.5,
						CITY_MAX_ZOOM,
						11
					]
				}
			},
			{
				id: 'traffic-flow',
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
					'line-cap': 'round',
					'line-join': 'round',
					visibility: 'visible'
				},
				paint: {
					'line-color': [
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
									1
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
					],
					'line-opacity': 0.92,
					'line-width': [
						'interpolate',
						['linear'],
						['zoom'],
						CITY_MIN_ZOOM,
						1.8,
						15,
						4.8,
						CITY_MAX_ZOOM,
						8
					]
				}
			},
			{
				/** Moving light dashes — dasharray is animated from ZurichCity. */
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
					'line-cap': 'round',
					'line-join': 'round',
					visibility: 'visible'
				},
				paint: {
					'line-color': [
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
									1
								],
								['length', ['coalesce', ['get', 'ref'], '']],
								['length', ['coalesce', ['get', 'name'], ['get', 'name:en'], 'rd']]
							],
							3
						],
						0,
						'#b8ffd0',
						1,
						'#ffe0a0',
						'#ffb0b0'
					],
					'line-opacity': 0.95,
					'line-width': [
						'interpolate',
						['linear'],
						['zoom'],
						CITY_MIN_ZOOM,
						1.6,
						15,
						3.4,
						CITY_MAX_ZOOM,
						5.5
					],
					'line-dasharray': [0.4, 2.2, 2.2, 4.5]
				}
			},
			{
				id: 'traffic-roads-query',
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
				layout: { visibility: 'visible' },
				paint: {
					'line-color': '#000000',
					'line-opacity': 0,
					'line-width': 12
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
				minzoom: CITY_MIN_ZOOM,
				layout: {
					'symbol-placement': 'line',
					'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
					'text-font': ['Noto Sans Regular'],
					'text-size': [
						'interpolate',
						['linear'],
						['zoom'],
						CITY_MIN_ZOOM,
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

export const TRAFFIC_STYLE_LAYERS = [
	'traffic-case',
	'traffic-flow',
	'traffic-pulse',
	'traffic-roads-query'
] as const;
