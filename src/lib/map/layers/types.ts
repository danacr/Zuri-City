import type {
	GeoJSONSource,
	Map as MapLibreMap
} from 'maplibre-gl';
import type { Place } from '$lib/places';
import type { Parking } from '$lib/parking';
import type { Camera, Flight, Quake } from '$lib/intel/types';

/** Shared context for installable map overlay plugins. */
export type CityLayerContext = {
	map: MapLibreMap;
	places: Place[];
	parkings: Parking[];
	flights: Flight[];
	cameras: Camera[];
	quakes: Quake[];
	showParking: boolean;
	showFlights: boolean;
	showCameras: boolean;
	showDetection: boolean;
	showQuakes: boolean;
	showTraffic: boolean;
};

export type CityLayerPlugin = {
	id: string;
	/** Create sources/layers once. Safe to call repeatedly (idempotent). */
	ensure: (ctx: CityLayerContext) => void;
	/** Push latest GeoJSON / layout visibility. */
	sync: (ctx: CityLayerContext) => void;
};

export function sourceData(map: MapLibreMap, id: string) {
	return map.getSource(id) as GeoJSONSource | undefined;
}
