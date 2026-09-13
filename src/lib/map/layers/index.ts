/**
 * Map overlay plugins for the Cesium city host.
 * Domain feeds sync through `$lib/map/layers/cesiumOverlays`.
 */
export {
	attachEntityClick,
	syncCameraEntities,
	syncFlightEntities,
	syncParkingEntities,
	syncPlaceEntities,
	syncQuakeEntities,
	syncTrafficEntities,
	syncUserEntity,
	type OverlayKind
} from './cesiumOverlays';
