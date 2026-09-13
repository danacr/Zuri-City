import { writable } from 'svelte/store';
import type { Place, PlaceCategory } from '$lib/places';
import type { Parking } from '$lib/parking';
import type { Camera, Flight, IntelLayer, Quake, SensorLook } from '$lib/intel/types';
import {
	createDefaultIntelLayers,
	createDefaultPlaceLayers,
	PARKING_LAYER
} from '$lib/city/layerRegistry';

/**
 * Shared city session state.
 * Page shell and map host read/write these stores so features can grow without
 * enlarging a single component's local `let` block.
 */
export type CityMode = 'orbit' | 'walk';

export const mode = writable<CityMode>('orbit');
export const layersOpen = writable(false);
export const placeLayers = writable<Record<PlaceCategory, boolean>>(createDefaultPlaceLayers());
export const intelLayers = writable<Record<IntelLayer, boolean>>(createDefaultIntelLayers());
export const showParking = writable(PARKING_LAYER.defaultVisible);
export const openNowOnly = writable(false);
export const sensorLook = writable<SensorLook>('normal');

export const places = writable<Place[]>([]);
export const parkings = writable<Parking[]>([]);
export const flights = writable<Flight[]>([]);
export const cameras = writable<Camera[]>([]);
export const quakes = writable<Quake[]>([]);
export const placesError = writable('');
export const parkingError = writable('');
export const intelNotes = writable<string[]>([]);
export const refreshedAt = writable<string | null>(null);

export const userPosition = writable<[number, number] | null>(null);
