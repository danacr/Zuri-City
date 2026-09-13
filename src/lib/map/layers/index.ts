/**
 * Map overlay plugins — each city feed owns ensure/sync so ZurichCity stays a host.
 *
 * Add a new overlay by creating `layers/<name>Layer.ts` and wiring it from the map host.
 */
export { ensureParkingLayer, syncParkingLayer, parkingsToGeoJSON } from './parkingLayer';
export { ensurePlacesLayer, syncPlacesLayer } from './placesLayer';
export {
	ensureSwissTrafficLayer,
	syncSwissTrafficLayer,
	trafficToGeoJSON,
	SWISS_TRAFFIC_SOURCE_ID,
	SWISS_TRAFFIC_CASE_LAYER_ID,
	SWISS_TRAFFIC_FLOW_LAYER_ID,
	TRAFFIC_LEVEL_COLOR
} from './swissTrafficLayer';
export type { CityLayerContext, CityLayerPlugin } from './types';
