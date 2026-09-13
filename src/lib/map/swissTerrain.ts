import type { Map as MapLibreMap, addProtocol } from 'maplibre-gl';
import quantizedMeshDecoder from '@here/quantized-mesh-decoder';
import {
	loadQuantizedMeshDataset,
	registerQuantizedMeshTerrain
} from 'maplibre-gl-3dtiles-terrain';
import { FALLBACK_TERRAIN_TILES, SWISS_TERRAIN_LAYER } from './swissSources';

export const TERRAIN_SOURCE_ID = 'swiss-terrain';

type MapLibreProtocolHost = {
	addProtocol: typeof addProtocol;
	removeProtocol: (protocol: string) => void;
};

export type TerrainHandle = {
	unregister?: () => void;
};

/**
 * Soft-resolve the quantized-mesh decoder.
 * Never throw at module load — that takes down the entire ssr:false map boot graph.
 */
function resolveDecode(): ((buffer: ArrayBuffer) => unknown) | null {
	try {
		const mod = quantizedMeshDecoder as
			| ((buffer: ArrayBuffer) => unknown)
			| {
					default:
						| ((buffer: ArrayBuffer) => unknown)
						| { default: (buffer: ArrayBuffer) => unknown };
			  };
		if (typeof mod === 'function') return mod;
		const inner = mod?.default;
		if (typeof inner === 'function') return inner;
		if (inner && typeof (inner as { default?: unknown }).default === 'function') {
			return (inner as { default: (buffer: ArrayBuffer) => unknown }).default;
		}
		console.warn('quantized-mesh decoder export shape unrecognized');
		return null;
	} catch (error) {
		console.warn('quantized-mesh decoder unavailable', error);
		return null;
	}
}

/**
 * Attach continuous elevation for Zürich.
 * Prefers swisstopo quantized-mesh; falls back to Terrarium DEM.
 * Soft-fails so OSM massing / parking / traffic still paint.
 */
export async function attachSwissTerrain(
	map: MapLibreMap,
	maplibregl: MapLibreProtocolHost
): Promise<TerrainHandle> {
	try {
		const decode = resolveDecode();
		if (!decode) {
			console.warn('swisstopo terrain skipped — decoder missing; using Terrarium');
			return attachFallbackTerrain(map);
		}

		const dataset = await loadQuantizedMeshDataset(SWISS_TERRAIN_LAYER, {
			attribution: 'Terrain: © swisstopo',
			boundsOverride: { west: 5.6, south: 45.5, east: 11.0, north: 48.2 },
			// Match walk zoom better — overzooming z14 DEM at walk ~16.8 causes seams.
			maxZoom: 15
		});
		const { sourceSpec, unregister } = registerQuantizedMeshTerrain(maplibregl, {
			dataset,
			decode: decode as (buffer: ArrayBuffer) => unknown,
			protocol: 'swiss-qm',
			fallbackHeight: 400
		});

		if (map.getSource(TERRAIN_SOURCE_ID)) {
			map.setTerrain(null);
			map.removeSource(TERRAIN_SOURCE_ID);
		}
		map.addSource(TERRAIN_SOURCE_ID, sourceSpec as never);
		// Exaggeration 1.0 — avoid amplifying DEM stair-steps against SWISSIMAGE.
		map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: 1 });
		return { unregister };
	} catch (error) {
		console.warn('swisstopo terrain unavailable — using Terrarium fallback', error);
		return attachFallbackTerrain(map);
	}
}

function attachFallbackTerrain(map: MapLibreMap): TerrainHandle {
	try {
		if (map.getSource(TERRAIN_SOURCE_ID)) {
			map.setTerrain(null);
			map.removeSource(TERRAIN_SOURCE_ID);
		}
		map.addSource(TERRAIN_SOURCE_ID, {
			type: 'raster-dem',
			tiles: [FALLBACK_TERRAIN_TILES],
			encoding: 'terrarium',
			tileSize: 256,
			maxzoom: 15,
			attribution: 'Mapzen / AWS Terrain Tiles'
		});
		map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: 1 });
	} catch (error) {
		console.warn('terrain fallback failed', error);
	}
	return {};
}
