import type { Viewer } from 'cesium';
import { CITY_MAX_ZOOM, CITY_MIN_ZOOM, ZURICH_LAT } from './swissSources';

/** Approximate MapLibre zoom → ellipsoid height (meters) at Zürich latitude. */
export function zoomToHeight(zoom: number, lat = ZURICH_LAT): number {
	const clamped = Math.min(CITY_MAX_ZOOM, Math.max(CITY_MIN_ZOOM, zoom));
	const metersPerPixel =
		(156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, clamped);
	return metersPerPixel * 520;
}

export function heightToZoom(height: number, lat = ZURICH_LAT): number {
	const metersPerPixel = Math.max(0.05, height / 520);
	const zoom = Math.log2(
		(156543.03392 * Math.cos((lat * Math.PI) / 180)) / metersPerPixel
	);
	return Math.min(CITY_MAX_ZOOM, Math.max(CITY_MIN_ZOOM, zoom));
}

/** MapLibre pitch (0 = nadir) → Cesium pitch degrees (−90 = nadir, 0 = horizon). */
export function mapPitchToCesium(pitchDeg: number): number {
	return pitchDeg - 90;
}

export function cesiumPitchToMap(pitchDeg: number): number {
	return pitchDeg + 90;
}

export type CityCameraPose = {
	lon: number;
	lat: number;
	zoom: number;
	pitch: number;
	bearing: number;
};

export async function flyCityCamera(
	viewer: Viewer,
	pose: CityCameraPose,
	duration = 1.4
): Promise<void> {
	const Cesium = await import('cesium');
	const height = zoomToHeight(pose.zoom, pose.lat);
	const destination = Cesium.Cartesian3.fromDegrees(pose.lon, pose.lat, height);
	const orientation = {
		heading: Cesium.Math.toRadians(pose.bearing),
		pitch: Cesium.Math.toRadians(mapPitchToCesium(pose.pitch)),
		roll: 0
	};
	if (duration <= 0) {
		viewer.camera.setView({ destination, orientation });
		return;
	}
	await new Promise<void>((resolve) => {
		viewer.camera.flyTo({
			destination,
			orientation,
			duration,
			complete: () => resolve(),
			cancel: () => resolve()
		});
	});
}
