/** Shared swisstopo endpoints and camera contract for the continuous city view. */

/** City framing — MapLibre-era zoom numbers; Cesium converts these to camera height. */
export const CITY_MIN_ZOOM = 11;
export const CITY_MAX_ZOOM = 18;

/** Default orbit camera — same layers as walk; only pose changes. */
export const ORBIT_CAMERA = {
	zoom: 14.6,
	pitch: 58,
	bearing: -18
} as const;

export const WALK_CAMERA = {
	zoom: 17.4,
	pitch: 72
} as const;

/** SWISSIMAGE WMTS (Web Mercator) for Cesium UrlTemplateImageryProvider. */
export const SWISSIMAGE_TILES =
	'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg';

/** swissBUILDINGS3D — native Cesium 3D Tileset (no ion key). */
export const SWISS_BUILDINGS_TILESET =
	'https://3d.geo.admin.ch/ch.swisstopo.swissbuildings3d.3d/v1/tileset.json';

/** swisstopo quantized-mesh terrain root (CesiumTerrainProvider). */
export const SWISS_TERRAIN_URL = 'https://3d.geo.admin.ch/ch.swisstopo.terrain.3d/v1/';

/** Fallback Terrarium DEM when swisstopo terrain is unreachable. */
export const FALLBACK_TERRAIN_TILES =
	'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

export const ZURICH_LON = 8.5417;
export const ZURICH_LAT = 47.3769;
