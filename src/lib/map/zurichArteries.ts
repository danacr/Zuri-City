/**
 * Major Zürich road corridors for congestion-colored traffic overlays.
 * Coordinates are [lon, lat].
 */
export type Artery = {
	id: string;
	name: string;
	level: 'free' | 'slow' | 'jam';
	coordinates: [number, number][];
};

export const ZURICH_ARTERIES: Artery[] = [
	{
		id: 'bahnhofstrasse',
		name: 'Bahnhofstrasse',
		level: 'slow',
		coordinates: [
			[8.5402, 47.3765],
			[8.5396, 47.3748],
			[8.539, 47.3732],
			[8.5385, 47.3715],
			[8.5381, 47.3698]
		]
	},
	{
		id: 'limmatquai',
		name: 'Limmatquai',
		level: 'free',
		coordinates: [
			[8.5432, 47.3772],
			[8.5438, 47.3755],
			[8.5445, 47.3738],
			[8.5452, 47.372]
		]
	},
	{
		id: 'langstrasse',
		name: 'Langstrasse',
		level: 'jam',
		coordinates: [
			[8.5295, 47.3815],
			[8.5288, 47.3795],
			[8.528, 47.3775],
			[8.5272, 47.3755],
			[8.5265, 47.3735]
		]
	},
	{
		id: 'hardbruecke',
		name: 'Hardbrücke',
		level: 'slow',
		coordinates: [
			[8.5175, 47.388],
			[8.5195, 47.3865],
			[8.5215, 47.385],
			[8.5235, 47.3835]
		]
	},
	{
		id: 'raemistrasse',
		name: 'Rämistrasse',
		level: 'free',
		coordinates: [
			[8.5485, 47.3745],
			[8.5495, 47.3725],
			[8.5505, 47.3705],
			[8.5512, 47.3685]
		]
	},
	{
		id: 'quaibruecke',
		name: 'Quaibrücke',
		level: 'slow',
		coordinates: [
			[8.543, 47.3668],
			[8.5445, 47.3665],
			[8.546, 47.3662],
			[8.5475, 47.366]
		]
	},
	{
		id: 'seebahnstrasse',
		name: 'Seebahnstrasse',
		level: 'free',
		coordinates: [
			[8.5255, 47.372],
			[8.5275, 47.3705],
			[8.5295, 47.369],
			[8.5315, 47.3675]
		]
	},
	{
		id: 'schaffhauserstrasse',
		name: 'Schaffhauserstrasse',
		level: 'slow',
		coordinates: [
			[8.5435, 47.392],
			[8.543, 47.3895],
			[8.5425, 47.387],
			[8.542, 47.3845]
		]
	},
	{
		id: 'talstrasse',
		name: 'Talstrasse',
		level: 'free',
		coordinates: [
			[8.5365, 47.3725],
			[8.5355, 47.371],
			[8.5345, 47.3695],
			[8.5335, 47.368]
		]
	},
	{
		id: 'utobruecke',
		name: 'Utobrücke',
		level: 'jam',
		coordinates: [
			[8.528, 47.3645],
			[8.53, 47.3642],
			[8.532, 47.364],
			[8.534, 47.3638]
		]
	}
];

export const TRAFFIC_LEVEL_COLOR: Record<Artery['level'], string> = {
	free: '#2f9e44',
	slow: '#f08c00',
	jam: '#e03131'
};
