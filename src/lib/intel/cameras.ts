import type { Camera, TrafficSegment } from './types';

/** Public / documented Zürich-area cameras. Live where a public still exists; otherwise modeled. */
export const ZURICH_CAMERAS: Camera[] = [
	{
		id: 'cam-quaibruecke',
		name: 'Quaibrücke · Lake view',
		lat: 47.3665,
		lon: 8.5432,
		bearing: 160,
		kind: 'lake',
		streamUrl: null,
		imageUrl:
			'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Zuerich_Buerkliplatz.jpg/640px-Zuerich_Buerkliplatz.jpg',
		modeled: true,
		note: 'Modeled public viewpoint toward Bürkliplatz / lake'
	},
	{
		id: 'cam-hb-bahnhofplatz',
		name: 'Zürich HB · Bahnhofplatz',
		lat: 47.3772,
		lon: 8.5395,
		bearing: 200,
		kind: 'transit',
		streamUrl: null,
		imageUrl:
			'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Zuerich_HB_Bahnhofplatz.jpg/640px-Zuerich_HB_Bahnhofplatz.jpg',
		modeled: true,
		note: 'Modeled station plaza camera pose'
	},
	{
		id: 'cam-hardbruecke',
		name: 'Hardbrücke corridor',
		lat: 47.3854,
		lon: 8.5178,
		bearing: 90,
		kind: 'traffic',
		streamUrl: null,
		imageUrl: null,
		modeled: true,
		note: 'Traffic corridor recon — feed modeled from published camera location'
	},
	{
		id: 'cam-schwamendingen',
		name: 'A1 Nordring · Schwamendingen',
		lat: 47.4065,
		lon: 8.5752,
		bearing: 250,
		kind: 'traffic',
		streamUrl: null,
		imageUrl: null,
		modeled: true,
		note: 'Motorway mesh camera (modeled pose)'
	},
	{
		id: 'cam-wallisellen',
		name: 'A1 · Wallisellen exit',
		lat: 47.4148,
		lon: 8.5925,
		bearing: 200,
		kind: 'traffic',
		streamUrl: null,
		imageUrl: null,
		modeled: true,
		note: 'A1 exit recon camera (modeled)'
	},
	{
		id: 'cam-prime-tower',
		name: 'Prime Tower overlook',
		lat: 47.3861,
		lon: 8.5172,
		bearing: 120,
		kind: 'city',
		streamUrl: null,
		imageUrl:
			'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Prime_Tower_Zurich.jpg/640px-Prime_Tower_Zurich.jpg',
		modeled: true,
		note: 'High overlook toward Hardbrücke / city'
	},
	{
		id: 'cam-lindenhof',
		name: 'Lindenhof overlook',
		lat: 47.373,
		lon: 8.5408,
		bearing: 100,
		kind: 'city',
		streamUrl: null,
		imageUrl:
			'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Lindenhof_Zuerich.jpg/640px-Lindenhof_Zuerich.jpg',
		modeled: true,
		note: 'Old-town overlook toward Limmat'
	},
	{
		id: 'cam-oper',
		name: 'Sechseläutenplatz · Opera',
		lat: 47.3651,
		lon: 8.5471,
		bearing: 280,
		kind: 'city',
		streamUrl: null,
		imageUrl: null,
		modeled: true,
		note: 'Plaza coverage volume (modeled)'
	},
	{
		id: 'cam-airport-approach',
		name: 'ZRH approach corridor',
		lat: 47.4585,
		lon: 8.548,
		bearing: 160,
		kind: 'traffic',
		streamUrl: null,
		imageUrl: null,
		modeled: true,
		note: 'Airport-area traffic / approach recon'
	},
	{
		id: 'cam-oerlikon',
		name: 'Oerlikon center',
		lat: 47.4115,
		lon: 8.5445,
		bearing: 180,
		kind: 'city',
		streamUrl: null,
		imageUrl: null,
		modeled: true,
		note: 'District center mesh camera'
	},
	{
		id: 'cam-engebucht',
		name: 'Lake quay · Enge',
		lat: 47.3635,
		lon: 8.5345,
		bearing: 90,
		kind: 'lake',
		streamUrl: null,
		imageUrl: null,
		modeled: true,
		note: 'Promenade camera pose'
	},
	{
		id: 'cam-polyterrasse',
		name: 'ETH Polyterrasse',
		lat: 47.3764,
		lon: 8.5476,
		bearing: 220,
		kind: 'city',
		streamUrl: null,
		imageUrl: null,
		modeled: true,
		note: 'Campus overlook of the city bowl'
	}
];

/** Major Zürich corridors used for keyless simulated traffic flow. */
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
	}
];

export function trafficLevelColor(level: TrafficSegment['level']) {
	return level === 'jam' ? '#c92a2a' : level === 'slow' ? '#f08c00' : '#2f9e44';
}

export function jitterTraffic(segments: TrafficSegment[]): TrafficSegment[] {
	return segments.map((segment, index) => {
		const roll = (Date.now() / 8000 + index * 1.7) % 3;
		const level: TrafficSegment['level'] =
			roll < 1 ? 'free' : roll < 2 ? 'slow' : index % 4 === 0 ? 'jam' : 'slow';
		return { ...segment, level };
	});
}
