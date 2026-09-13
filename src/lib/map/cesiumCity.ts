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

/**
 * Create a Cesium Viewer that owns SWISSIMAGE + swissBUILDINGS3D + swisstopo terrain.
 * No Cesium ion token required — all URLs are public geo.admin.ch endpoints.
 */
export async function createCesiumCity(container: HTMLElement): Promise<CesiumCityHandle> {
	const Cesium = await import('cesium');
	await import('cesium/Build/Cesium/Widgets/widgets.css');

	if (Cesium.Ion) {
		Cesium.Ion.defaultAccessToken = '';
	}

	let terrainProvider: TerrainProvider;
	try {
		terrainProvider = await Cesium.CesiumTerrainProvider.fromUrl(SWISS_TERRAIN_URL, {
			requestVertexNormals: true
		});
	} catch (error) {
		console.warn('swisstopo terrain unavailable — using ellipsoid', error);
		terrainProvider = new Cesium.EllipsoidTerrainProvider();
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
		terrainProvider,
		baseLayer: false,
		requestRenderMode: true,
		maximumRenderTimeChange: Infinity
	});

	viewer.scene.globe.depthTestAgainstTerrain = true;
	viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#07131f');
	viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#07131f');
	viewer.scene.fog.enabled = true;
	if (viewer.scene.skyAtmosphere) if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = true;
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
	imagery.saturation = 0.95;

	let buildings: Cesium3DTileset | null = null;
	try {
		const mobile = typeof window !== 'undefined' && window.innerWidth < 768;
		buildings = await Cesium.Cesium3DTileset.fromUrl(SWISS_BUILDINGS_TILESET, {
			maximumScreenSpaceError: mobile ? 16 : 8,
			cacheBytes: 256 * 1024 * 1024,
			maximumCacheOverflowBytes: 128 * 1024 * 1024
		});
		viewer.scene.primitives.add(buildings);
	} catch (error) {
		console.warn('swissBUILDINGS3D failed to load', error);
		buildings = null;
	}

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

	return {
		viewer,
		buildings,
		imagery,
		destroy: () => {
			try {
				viewer.destroy();
			} catch {
				/* already destroyed */
			}
		}
	};
}

export { flyCityCamera };
