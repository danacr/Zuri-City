import type { Cesium3DTileset, ImageryLayer, TerrainProvider, Viewer } from 'cesium';
import {
	ORBIT_CAMERA,
	SWISS_BUILDINGS_TILESET,
	SWISS_TERRAIN_URL,
	SWISSIMAGE_TILES,
	ZURICH_LAT,
	ZURICH_LON
} from './swissSources';
import { flyCityCamera, mapPitchToCesium, zoomToHeight } from './cesiumCamera';

export type CesiumCityHandle = {
	viewer: Viewer;
	buildings: Cesium3DTileset | null;
	imagery: ImageryLayer;
	destroy: () => void;
};

const CESIUM_ASSET_BASE = '/cesiumStatic/';

function ensureCesiumBaseUrl() {
	if (typeof window === 'undefined') return;
	const w = window as Window & { CESIUM_BASE_URL?: string };
	if (!w.CESIUM_BASE_URL) w.CESIUM_BASE_URL = CESIUM_ASSET_BASE;
}

/**
 * Create a Cesium Viewer that owns SWISSIMAGE + swissBUILDINGS3D + swisstopo terrain.
 * No Cesium ion token required — all URLs are public geo.admin.ch endpoints.
 *
 * Boot is resilient: ellipsoid + imagery first, terrain/buildings attach in background
 * so a slow 3D tileset never blanks the whole map.
 */
export async function createCesiumCity(container: HTMLElement): Promise<CesiumCityHandle> {
	ensureCesiumBaseUrl();

	const Cesium = await import('cesium');
	await import('cesium/Build/Cesium/Widgets/widgets.css');

	// Never hit ion defaults — we supply our own imagery/terrain.
	if (Cesium.Ion) {
		Cesium.Ion.defaultAccessToken = '';
	}

	const viewer = new Cesium.Viewer(container, {
		animation: false,
		timeline: false,
		baseLayerPicker: false,
		fullscreenButton: false,
		vrButton: false,
		geocoder: false,
		homeButton: false,
		infoBox: false,
		sceneModePicker: false,
		selectionIndicator: false,
		navigationHelpButton: false,
		navigationInstructionsInitiallyVisible: false,
		creditContainer: document.createElement('div'),
		// Fast sync boot — upgrade to swisstopo terrain after first frame.
		terrainProvider: new Cesium.EllipsoidTerrainProvider(),
		baseLayer: false,
		requestRenderMode: true,
		maximumRenderTimeChange: Infinity,
		contextOptions: {
			webgl: {
				alpha: false,
				antialias: true,
				powerPreference: 'high-performance'
			}
		}
	});

	viewer.scene.globe.depthTestAgainstTerrain = true;
	viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#07131f');
	viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#07131f');
	viewer.scene.fog.enabled = true;
	if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = true;
	viewer.scene.globe.enableLighting = false;
	viewer.scene.screenSpaceCameraController.minimumZoomDistance = zoomToHeight(18);
	viewer.scene.screenSpaceCameraController.maximumZoomDistance = zoomToHeight(11);

	const imageryProvider = new Cesium.UrlTemplateImageryProvider({
		url: SWISSIMAGE_TILES,
		maximumLevel: 19,
		credit: '© swisstopo — SWISSIMAGE'
	});
	const imagery = viewer.imageryLayers.addImageryProvider(imageryProvider);
	imagery.brightness = 1.02;
	imagery.contrast = 1.05;
	imagery.saturation = 0.92;

	viewer.camera.setView({
		destination: Cesium.Cartesian3.fromDegrees(
			ZURICH_LON,
			ZURICH_LAT,
			zoomToHeight(ORBIT_CAMERA.zoom)
		),
		orientation: {
			heading: Cesium.Math.toRadians(ORBIT_CAMERA.bearing),
			pitch: Cesium.Math.toRadians(mapPitchToCesium(ORBIT_CAMERA.pitch)),
			roll: 0
		}
	});

	viewer.camera.changed.addEventListener(() => viewer.scene.requestRender());
	viewer.scene.requestRender();

	const handle: CesiumCityHandle = {
		viewer,
		buildings: null,
		imagery,
		destroy: () => {
			try {
				viewer.destroy();
			} catch {
				/* already destroyed */
			}
		}
	};

	// Non-blocking upgrades — map is already usable with aerial + ellipsoid.
	void attachSwissTerrain(viewer, Cesium);
	void attachSwissBuildings(handle, Cesium);

	return handle;
}

async function attachSwissTerrain(
	viewer: Viewer,
	Cesium: typeof import('cesium')
): Promise<void> {
	try {
		const terrainProvider: TerrainProvider = await Cesium.CesiumTerrainProvider.fromUrl(
			SWISS_TERRAIN_URL,
			{ requestVertexNormals: true }
		);
		if (!viewer.isDestroyed()) {
			viewer.terrainProvider = terrainProvider;
			viewer.scene.requestRender();
		}
	} catch (error) {
		console.warn('swisstopo terrain unavailable — keeping ellipsoid', error);
	}
}

async function attachSwissBuildings(
	handle: CesiumCityHandle,
	Cesium: typeof import('cesium')
): Promise<void> {
	try {
		const mobile = typeof window !== 'undefined' && window.innerWidth < 768;
		const buildings = await Cesium.Cesium3DTileset.fromUrl(SWISS_BUILDINGS_TILESET, {
			maximumScreenSpaceError: mobile ? 24 : 12,
			cacheBytes: 192 * 1024 * 1024,
			maximumCacheOverflowBytes: 96 * 1024 * 1024
		});
		if (handle.viewer.isDestroyed()) {
			buildings.destroy();
			return;
		}
		handle.viewer.scene.primitives.add(buildings);
		handle.buildings = buildings;
		handle.viewer.scene.requestRender();
	} catch (error) {
		console.warn('swissBUILDINGS3D failed to load', error);
	}
}

export { flyCityCamera };
