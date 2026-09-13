/** Shared swisstopo endpoints and camera contract for the continuous city view. */

/** City framing — low enough to take in the basin, high enough to keep Zürich readable. */
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

export const SWISSIMAGE_TILES =
	'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg';

export const SWISS_BUILDINGS_TILESET =
	'https://3d.geo.admin.ch/ch.swisstopo.swissbuildings3d.3d/v1/tileset.json';

export const SWISS_TERRAIN_LAYER =
	'https://3d.geo.admin.ch/ch.swisstopo.terrain.3d/v1/layer.json';

/** Fallback DEM when swisstopo quantized-mesh is unreachable. */
export const FALLBACK_TERRAIN_TILES =
	'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

/**
 * Phase-2 swissBUILDINGS3D mesh (Three.js custom layer). Off by default —
 * ghost OSM extrusions in aerialStyle are the reliable city massing path.
 * Set `PUBLIC_SWISS_BUILDINGS=1` to opt in when the mesh layer is stable.
 */
export const SWISS_BUILDINGS_ENABLED =
	import.meta.env.PUBLIC_SWISS_BUILDINGS === '1' ||
	import.meta.env.PUBLIC_SWISS_BUILDINGS === 'true';
