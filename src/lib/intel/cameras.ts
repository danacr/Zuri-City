import type { Camera, TrafficSegment } from './types';

/**
 * Validated live ASTRA Mobcam stills (JPEG updates every few seconds).
 * Pins are approximate corridor placements from published Zürich-area motorway context
 * (e.g. MVK172 shows Zürich-Nord / Y63 signage). Feeds are proxied via /api/cctv/[id].
 */
export const ZURICH_CAMERAS: Camera[] = [
	{
		id: 'mvk172',
		name: 'A1 · Zürich-Nord (MVK172)',
		lat: 47.4148,
		lon: 8.5082,
		bearing: 35,
		kind: 'traffic',
		streamUrl: null,
		imageUrl: '/api/cctv/mvk172',
		modeled: false,
		note: 'Live ASTRA Mobcam still · Zürich-Nord / Y63 corridor (validated JPEG feed)'
	},
	{
		id: 'mvk111',
		name: 'A1 Glatttal corridor (MVK111)',
		lat: 47.4326,
		lon: 8.5618,
		bearing: 200,
		kind: 'traffic',
		streamUrl: null,
		imageUrl: '/api/cctv/mvk111',
		modeled: false,
		note: 'Live ASTRA Mobcam still · multi-lane urban motorway (validated)'
	},
	{
		id: 'mvk109',
		name: 'Nordring wooded cut (MVK109)',
		lat: 47.4215,
		lon: 8.5455,
		bearing: 250,
		kind: 'traffic',
		streamUrl: null,
		imageUrl: '/api/cctv/mvk109',
		modeled: false,
		note: 'Live ASTRA Mobcam still · Nordring approach (validated)'
	},
	{
		id: 'mvk105',
		name: 'A1 east approach (MVK105)',
		lat: 47.4112,
		lon: 8.5924,
		bearing: 270,
		kind: 'traffic',
		streamUrl: null,
		imageUrl: '/api/cctv/mvk105',
		modeled: false,
		note: 'Live ASTRA Mobcam still · eastern A1 approach (validated)'
	},
	{
		id: 'mvk103',
		name: 'Wallisellen sector (MVK103)',
		lat: 47.4168,
		lon: 8.591,
		bearing: 210,
		kind: 'traffic',
		streamUrl: null,
		imageUrl: '/api/cctv/mvk103',
		modeled: false,
		note: 'Live ASTRA Mobcam still · Wallisellen sector (validated)'
	},
	{
		id: 'mvk102',
		name: 'Opfikon sector (MVK102)',
		lat: 47.4245,
		lon: 8.5712,
		bearing: 180,
		kind: 'traffic',
		streamUrl: null,
		imageUrl: '/api/cctv/mvk102',
		modeled: false,
		note: 'Live ASTRA Mobcam still · Opfikon sector (validated)'
	},
	{
		id: 'mvk101',
		name: 'Glattbrugg sector (MVK101)',
		lat: 47.4288,
		lon: 8.5585,
		bearing: 160,
		kind: 'traffic',
		streamUrl: null,
		imageUrl: '/api/cctv/mvk101',
		modeled: false,
		note: 'Live ASTRA Mobcam still · Glattbrugg sector (validated)'
	},
	{
		id: 'mvk121',
		name: 'West approach corridor (MVK121)',
		lat: 47.3895,
		lon: 8.4915,
		bearing: 90,
		kind: 'traffic',
		streamUrl: null,
		imageUrl: '/api/cctv/mvk121',
		modeled: false,
		note: 'Live ASTRA Mobcam still · western approach (validated)'
	},
	{
		id: 'mvk173',
		name: 'A1 companion cam (MVK173)',
		lat: 47.4182,
		lon: 8.5145,
		bearing: 40,
		kind: 'traffic',
		streamUrl: null,
		imageUrl: '/api/cctv/mvk173',
		modeled: false,
		note: 'Live ASTRA Mobcam still · paired with Zürich-Nord corridor (validated)'
	},
	{
		id: 'mvk107',
		name: 'City-ring cam (MVK107)',
		lat: 47.4042,
		lon: 8.5688,
		bearing: 300,
		kind: 'traffic',
		streamUrl: null,
		imageUrl: '/api/cctv/mvk107',
		modeled: false,
		note: 'Live ASTRA Mobcam still · city-ring sector (validated)'
	}
];

/** Upstream ASTRA still URLs keyed by camera id (mvk###). */
export const CCTV_UPSTREAM: Record<string, string> = Object.fromEntries(
	ZURICH_CAMERAS.map((camera) => [
		camera.id,
		`https://www.astramobcam.ch/kamera/${camera.id}/live.jpg`
	])
);

export const TRAFFIC_CORRIDORS: TrafficSegment[] = [
	{
		id: 'tr-bahnhofstrasse',
		name: 'Bahnhofstrasse',
		coordinates: [
			[8.539854, 47.376868],
			[8.539638, 47.376171],
			[8.538953, 47.375299],
			[8.538885, 47.374775],
			[8.538659, 47.374426],
			[8.538283, 47.374078],
			[8.538268, 47.373205],
			[8.538370, 47.372159],
			[8.538794, 47.371287],
			[8.538827, 47.370938],
			[8.539184, 47.370240],
			[8.539469, 47.369193],
			[8.539844, 47.368496],
			[8.540038, 47.367798],
			[8.540224, 47.367449],
			[8.540118, 47.367275],
			[8.540476, 47.366577],
		],
		level: 'slow',
		modeled: true
	},
	{
		id: 'tr-limmatquai',
		name: 'Limmatquai',
		coordinates: [
			[8.543508, 47.376337],
			[8.543493, 47.376137],
			[8.543638, 47.376083],
			[8.542795, 47.373424],
			[8.542931, 47.371180],
			[8.543464, 47.369765],
			[8.543582, 47.368973],
			[8.545202, 47.367521],
		],
		level: 'free',
		modeled: true
	},
	{
		id: 'tr-langstrasse',
		name: 'Langstrasse',
		coordinates: [
			[8.531254, 47.384288],
			[8.528919, 47.381484],
			[8.527934, 47.380069],
			[8.526369, 47.377379],
			[8.524945, 47.375371],
		],
		level: 'slow',
		modeled: true
	},
	{
		id: 'tr-hardbruecke',
		name: 'Hardbrücke',
		coordinates: [
			[8.515742, 47.383680],
			[8.523649, 47.391839],
			[8.524299, 47.392610],
			[8.524731, 47.393476],
		],
		level: 'jam',
		modeled: true
	},
	{
		id: 'tr-quai',
		name: 'Utoquai / Quaibrücke',
		coordinates: [
			[8.545262, 47.366468],
			[8.545137, 47.366085],
			[8.547991, 47.361271],
		],
		level: 'free',
		modeled: true
	},
	{
		id: 'tr-rosengarten',
		name: 'Rosengartenstrasse',
		coordinates: [
			[8.527279, 47.396214],
			[8.526160, 47.395549],
			[8.524188, 47.392786],
			[8.523773, 47.392676],
		],
		level: 'slow',
		modeled: true
	},
	{
		id: 'tr-a1l',
		name: 'A1L / Nordring',
		coordinates: [
			[8.538242, 47.386102],
			[8.541945, 47.388821],
			[8.543842, 47.390930],
			[8.544685, 47.392667],
			[8.545579, 47.396826],
			[8.546310, 47.398103],
			[8.547899, 47.399623],
			[8.554342, 47.402822],
			[8.563720, 47.405762],
			[8.566153, 47.407256],
			[8.569549, 47.409946],
			[8.573823, 47.411921],
			[8.574578, 47.412977],
			[8.574554, 47.414354],
		],
		level: 'free',
		modeled: true
	},
	{
		id: 'tr-a1-nord',
		name: 'A1 Zürich-Nord',
		coordinates: [
			[8.489223, 47.425799],
			[8.502224, 47.427336],
			[8.519317, 47.432334],
			[8.524615, 47.433358],
			[8.530303, 47.433804],
			[8.536974, 47.433537],
			[8.543918, 47.432316],
			[8.550187, 47.430251],
			[8.556108, 47.427350],
		],
		level: 'slow',
		modeled: true
	},
];

export function trafficLevelColor(level: TrafficSegment['level']) {
	return level === 'jam' ? '#ff3b30' : level === 'slow' ? '#ff9f0a' : '#30d158';
}

export function jitterTraffic(segments: TrafficSegment[]): TrafficSegment[] {
	return segments.map((segment, index) => {
		const roll = (Date.now() / 8000 + index * 1.7) % 3;
		const level: TrafficSegment['level'] =
			roll < 1 ? 'free' : roll < 2 ? 'slow' : index % 4 === 0 ? 'jam' : 'slow';
		return { ...segment, level };
	});
}
