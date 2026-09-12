import type { StyleSpecification } from 'maplibre-gl';

/**
 * Aerial god’s-eye basemap for Zürich:
 * SWISSIMAGE under OpenMapTiles 3D buildings. Traffic is shown as congestion-colored OSM streets; cars are a zoom-in accent
 * (see trafficCars.ts).
 */
export function zurichAerialStyle(): StyleSpecification {
	return {
		version: 8,
		name: 'zuri-aerial-3d',
		glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
		sources: {
			aerial: {
				type: 'raster',
				tiles: [
					// Official SWISSIMAGE XYZ (Web Mercator) — CORS enabled.
					'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg'
				],
				tileSize: 256,
				minzoom: 0,
				maxzoom: 19,
				attribution: '© swisstopo — SWISSIMAGE'
			},
			terrain: {
				type: 'raster-dem',
				tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
				encoding: 'terrarium',
				tileSize: 256,
				maxzoom: 15,
				attribution: 'Mapzen / AWS Terrain Tiles'
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
				paint: { 'raster-opacity': 1, 'raster-saturation': -0.02, 'raster-contrast': 0.08 }
			},
			{
				id: 'zurich-3d-buildings',
				type: 'fill-extrusion',
				source: 'openmaptiles',
				'source-layer': 'building',
				minzoom: 13,
				filter: ['!=', ['get', 'hide_3d'], true],
				paint: {
					'fill-extrusion-color': [
						'interpolate',
						['linear'],
						['coalesce', ['get', 'render_height'], 12],
						0,
						'#c4b6a6',
						18,
						'#b09a86',
						40,
						'#9a8776',
						80,
						'#7d6d60',
						140,
						'#5c524a'
					],
					'fill-extrusion-height': [
						'interpolate',
						['linear'],
						['zoom'],
						13,
						0,
						14,
						['*', ['coalesce', ['get', 'render_height'], 10], 0.4],
						15,
						['coalesce', ['get', 'render_height'], 12]
					],
					'fill-extrusion-base': [
						'case',
						['has', 'render_min_height'],
						['get', 'render_min_height'],
						0
					],
					'fill-extrusion-opacity': 0.78,
					'fill-extrusion-vertical-gradient': true
				}
			},
			// Primary traffic: congestion-colored OSM centerlines (readable from orbit).
			{
				id: 'traffic-case',
				type: 'line',
				source: 'openmaptiles',
				'source-layer': 'transportation',
				minzoom: 11,
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
					'line-width': ['interpolate', ['linear'], ['zoom'], 11, 2.4, 13, 4.5, 15, 7.5, 17, 11]
				}
			},
			{
				id: 'traffic-flow',
				type: 'line',
				source: 'openmaptiles',
				'source-layer': 'transportation',
				minzoom: 11,
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
					'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1.6, 13, 3.2, 15, 5.2, 17, 8]
				}
			},
			// Wide invisible query layer for optional car accents (higher zooms).
			{
				id: 'traffic-roads-query',
				type: 'line',
				source: 'openmaptiles',
				'source-layer': 'transportation',
				minzoom: 14,
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
					'line-width': 10
				}
			},
			{
				id: 'place-label',
				type: 'symbol',
				source: 'openmaptiles',
				'source-layer': 'place',
				minzoom: 11,
				filter: ['in', ['get', 'class'], ['literal', ['suburb', 'neighbourhood', 'quarter']]],
				layout: {
					'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
					'text-font': ['Noto Sans Regular'],
					'text-size': 12,
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
					'text-size': 11,
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

export const TRAFFIC_STYLE_LAYERS = ['traffic-case', 'traffic-flow', 'traffic-roads-query', 'traffic-cars'] as const;
