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
			[8.5402, 47.378],
			[8.5396, 47.3748],
			[8.5392, 47.3718],
			[8.5408, 47.3668]
		],
		level: 'slow',
		modeled: true
	},
	{
		id: 'tr-quai',
		name: 'Utoquai / Quaibrücke',
		coordinates: [
			[8.5475, 47.3615],
			[8.5445, 47.3645],
			[8.543, 47.3668],
			[8.5415, 47.3688]
		],
		level: 'free',
		modeled: true
	},
	{
		id: 'tr-hardbruecke',
		name: 'Hardbrücke',
		coordinates: [
			[8.5105, 47.3878],
			[8.5175, 47.3858],
			[8.5255, 47.3842],
			[8.5335, 47.3825]
		],
		level: 'jam',
		modeled: true
	},
	{
		id: 'tr-rosengarten',
		name: 'Rosengartenstrasse',
		coordinates: [
			[8.5305, 47.3935],
			[8.5338, 47.3895],
			[8.5365, 47.3855],
			[8.5392, 47.3815]
		],
		level: 'slow',
		modeled: true
	},
	{
		id: 'tr-a1l',
		name: 'A1L / Nordring',
		coordinates: [
			[8.505, 47.402],
			[8.525, 47.405],
			[8.555, 47.408],
			[8.585, 47.412]
		],
		level: 'free',
		modeled: true
	},
	{
		id: 'tr-langstrasse',
		name: 'Langstrasse',
		coordinates: [
			[8.5285, 47.3815],
			[8.5298, 47.3785],
			[8.5312, 47.3755],
			[8.5328, 47.3728]
		],
		level: 'slow',
		modeled: true
	},
	{
		id: 'tr-limmatquai',
		name: 'Limmatquai',
		coordinates: [
			[8.5435, 47.3765],
			[8.5438, 47.3735],
			[8.5442, 47.371],
			[8.5435, 47.3685]
		],
		level: 'free',
		modeled: true
	},
	{
		id: 'tr-a1-nord',
		name: 'A1 Zürich-Nord',
		coordinates: [
			[8.495, 47.41],
			[8.508, 47.414],
			[8.52, 47.417],
			[8.545, 47.42]
		],
		level: 'slow',
		modeled: true
	}
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
