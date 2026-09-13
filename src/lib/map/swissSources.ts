/** Shared swisstopo endpoints and camera contract for the continuous city view. */

/** City framing — low enough to take in the basin, high enough to keep Zürich readable. */
export const CITY_MIN_ZOOM = 11;
export const CITY_MAX_ZOOM = 18;

/**
 * Orbit = city inspection from altitude (read the basin).
 * Walk = street-level immersion (locked high pitch, locomotion).
 * Layers stay identical — pose + interaction model change.
 */
/** Default basin view — steep enough that OSM extrusions read as a city, not a flat aerial. */
export const ORBIT_CAMERA = {
	zoom: 14.6,
	pitch: 58,
	bearing: -18
} as const;

export const WALK_CAMERA = {
	zoom: 16.8,
	pitch: 68,
	/** Eye-height feel: keep pitch high; do not drift toward orbit. */
	minPitch: 55,
	maxPitch: 78
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
 * swissBUILDINGS3D mesh (Three.js custom layer). On by default so orbit/walk
 * read as Zürich rather than beige OSM boxes; soft-fails to OSM extrusions.
 * Set `PUBLIC_SWISS_BUILDINGS=0` to force OSM-only massing.
 */
export const SWISS_BUILDINGS_ENABLED =
	import.meta.env.PUBLIC_SWISS_BUILDINGS !== '0' &&
	import.meta.env.PUBLIC_SWISS_BUILDINGS !== 'false';
