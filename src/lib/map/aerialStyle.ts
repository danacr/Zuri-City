import type { StyleSpecification } from 'maplibre-gl';

/**
 * Aerial / satellite god’s-eye basemap for Zürich:
 * satellite/aerial imagery under solid OpenMapTiles 3D building masses.
 * (True street-view façade meshes need a commercial 3D-tiles key; this is the
 * best keyless photoreal ground + volumetric city read.)
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
					// Esri World Imagery — CORS-friendly satellite/aerial (XYZ z/y/x).
					'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
				],
				tileSize: 256,
				maxzoom: 19,
				attribution:
					'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
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
				paint: { 'raster-opacity': 1, 'raster-saturation': -0.02, 'raster-contrast': 0.06 }
			},
			// No OSM road casings on the aerial — Zürich city streets read from
			// imagery. Vector road lines were drifting off Esri tiles in-town.
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
					'fill-extrusion-opacity': 0.82,
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
