import type { Place } from '$lib/places';
import type { Parking } from '$lib/parking';
import type { Camera, Flight, Quake } from '$lib/intel/types';

/** Shared context for Cesium overlay sync (domain feeds → entity collections). */
export type CityLayerContext = {
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
	/** Create overlay state once. Safe to call repeatedly (idempotent). */
	ensure: (ctx: CityLayerContext) => void;
	/** Push latest entity data / visibility. */
	sync: (ctx: CityLayerContext) => void;
};
