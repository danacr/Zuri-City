import {
	CATEGORY_COLOR,
	CATEGORY_LABEL,
	PLACE_CATEGORIES,
	type PlaceCategory
} from './places';
import {
	INTEL_LAYER_COLOR,
	INTEL_LAYER_LABEL,
	type IntelLayer
} from '$lib/intel/types';

/** Ordered intel layer ids for HUD toggles. */
export const INTEL_LAYER_IDS: IntelLayer[] = [
	'flights',
	'cameras',
	'traffic',
	'quakes',
	'detection'
];

/** Place categories default to all visible. */
export const DEFAULT_PLACE_LAYERS: Record<PlaceCategory, boolean> = Object.fromEntries(
	PLACE_CATEGORIES.map((id) => [id, true])
) as Record<PlaceCategory, boolean>;

/** Live-feed defaults (quakes off — denser overlays stay opt-in). */
export const DEFAULT_INTEL_LAYERS: Record<IntelLayer, boolean> = {
	flights: true,
	cameras: true,
	traffic: true,
	quakes: false,
	detection: true
};

export const PARKING_LAYER = {
	id: 'parking' as const,
	label: 'Parking',
	color: '#1c7ed6',
	/** Show open/capacity labels on the map by default. */
	defaultVisible: true
};

export type LayerCounts = Record<PlaceCategory, number> & {
	openNow: number;
	parking: number;
	flights: number;
	cameras: number;
	traffic: number | string;
	quakes: number;
};

export function createDefaultPlaceLayers(): Record<PlaceCategory, boolean> {
	return { ...DEFAULT_PLACE_LAYERS };
}

export function createDefaultIntelLayers(): Record<IntelLayer, boolean> {
	return { ...DEFAULT_INTEL_LAYERS };
}

export function setAllPlaceLayers(
	visible: boolean
): Record<PlaceCategory, boolean> {
	return Object.fromEntries(PLACE_CATEGORIES.map((id) => [id, visible])) as Record<
		PlaceCategory,
		boolean
	>;
}

export {
	PLACE_CATEGORIES,
	CATEGORY_LABEL,
	CATEGORY_COLOR,
	INTEL_LAYER_LABEL,
	INTEL_LAYER_COLOR
};
