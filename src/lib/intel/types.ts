export type IntelLayer = 'flights' | 'cameras' | 'traffic' | 'quakes' | 'detection';

export type SensorLook = 'normal' | 'nvg' | 'flir' | 'crt' | 'noir' | 'snow';

/** Rough airframe size for map icons (from ADS-B category / type). */
export type FlightSize = 'light' | 'medium' | 'heavy' | 'rotor';

export type Flight = {
	id: string;
	callsign: string;
	lat: number;
	lon: number;
	altitudeFt: number | null;
	heading: number | null;
	speedKts: number | null;
	onGround: boolean;
	size: FlightSize;
	typeCode: string | null;
};

export type Camera = {
	id: string;
	name: string;
	lat: number;
	lon: number;
	bearing: number;
	kind: 'traffic' | 'city' | 'lake' | 'transit';
	streamUrl: string | null;
	imageUrl: string | null;
	modeled: boolean;
	note: string;
};

export type TrafficSegment = {
	id: string;
	name: string;
	/** LineString positions as [lon, lat]. */
	coordinates: [number, number][];
	level: 'free' | 'slow' | 'jam';
	/** True only for synthetic placeholders — live ASTRA DATEX is false. */
	modeled: boolean;
};

export type Quake = {
	id: string;
	mag: number;
	place: string;
	lat: number;
	lon: number;
	depthKm: number;
	time: string;
};

export type IntelSnapshot = {
	flights: Flight[];
	cameras: Camera[];
	traffic: TrafficSegment[];
	quakes: Quake[];
	fetchedAt: string;
	notes: string[];
};

export const INTEL_LAYER_LABEL: Record<IntelLayer, string> = {
	flights: 'Aircraft',
	cameras: 'Cameras',
	traffic: 'Traffic (ASTRA)',
	quakes: 'Quakes',
	detection: 'Camera cones'
};

/** Legend for live ASTRA DATEX counter speeds (not a road-name hash). */
export const TRAFFIC_LEGEND: { label: string; color: string }[] = [
	{ label: 'Free', color: '#1faa5b' },
	{ label: 'Slow', color: '#e0a21b' },
	{ label: 'Jam', color: '#e03131' }
];

export const INTEL_LAYER_COLOR: Record<IntelLayer, string> = {
	flights: '#f0b429',
	cameras: '#7c5cff',
	traffic: '#2f9e44',
	quakes: '#e64980',
	detection: '#3dd68c'
};

export const SENSOR_LOOKS: { id: SensorLook; label: string; key: string }[] = [
	{ id: 'normal', label: 'RGB', key: '1' },
	{ id: 'nvg', label: 'NVG', key: '2' },
	{ id: 'flir', label: 'FLIR', key: '3' },
	{ id: 'crt', label: 'CRT', key: '4' },
	{ id: 'noir', label: 'Noir', key: '5' },
	{ id: 'snow', label: 'Snow', key: '6' }
];

export const ZRH_BBOX = {
	lat: 47.3769,
	lon: 8.5417,
	radiusNm: 35
};
