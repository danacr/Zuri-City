import type { StyleSpecification } from 'maplibre-gl';

/**
 * Aerial / satellite god’s-eye basemap for Zürich:
 * swisstopo Swissimage under solid OpenMapTiles 3D building masses.
 * (True street-view façade meshes need a commercial 3D-tiles key; this is the
 * best keyless photoreal ground + volumetric city read.)
 */
export function zurichAerialStyle(): StyleSpecification {
	return {
		version: 8,
		name: 'zuri-aerial-3d',
		glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
		sources: {
			swissimage: {
				type: 'raster',
				tiles: [
					'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg'
				],
				tileSize: 256,
				maxzoom: 19,
				attribution: '© swisstopo'
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
				source: 'swissimage',
				paint: { 'raster-opacity': 1, 'raster-saturation': -0.05, 'raster-contrast': 0.08 }
			},
			{
				id: 'road-case',
				type: 'line',
				source: 'openmaptiles',
				'source-layer': 'transportation',
				minzoom: 12,
				filter: [
					'all',
					['!=', ['get', 'class'], 'path'],
					['!=', ['get', 'class'], 'track'],
					['!=', ['get', 'class'], 'ferry']
				],
				paint: {
					'line-color': '#0b1724',
					'line-opacity': 0.35,
					'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.6, 16, 4, 18, 8]
				},
				layout: { 'line-cap': 'round', 'line-join': 'round' }
			},
			{
				id: 'road-fill',
				type: 'line',
				source: 'openmaptiles',
				'source-layer': 'transportation',
				minzoom: 12,
				filter: [
					'all',
					['!=', ['get', 'class'], 'path'],
					['!=', ['get', 'class'], 'track'],
					['!=', ['get', 'class'], 'ferry']
				],
				paint: {
					'line-color': '#f4f0e6',
					'line-opacity': 0.55,
					'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.3, 16, 2.2, 18, 5]
				},
				layout: { 'line-cap': 'round', 'line-join': 'round' }
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
					'fill-extrusion-opacity': 0.96,
					'fill-extrusion-vertical-gradient': true
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
