import type { Parking } from './model';

/**
 * Coord assist for live PLS items that fail map-page scrape.
 * Never shown as the visible parking set — live RSS is always required.
 */
export const FALLBACK_PARKINGS: Parking[] = [
	{
		id: 'fallback-urania',
		name: 'Urania',
		address: 'Uraniastrasse 3',
		status: 'open',
		free: null,
		capacity: 600,
		coordinates: [47.3745, 8.5412],
		directions:
			'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=Parkhaus+Urania,+Zürich',
		link: 'https://www.pls-zh.ch/',
		updated: null
	},
	{
		id: 'fallback-jelmoli',
		name: 'Jelmoli',
		address: 'Seidengasse 1',
		status: 'open',
		free: null,
		capacity: 250,
		coordinates: [47.3738, 8.5376],
		directions:
			'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=Parkhaus+Jelmoli,+Zürich',
		link: 'https://www.pls-zh.ch/',
		updated: null
	},
	{
		id: 'fallback-mainstation',
		name: 'Hauptbahnhof',
		address: 'Sihlquai 41',
		status: 'open',
		free: null,
		capacity: 420,
		coordinates: [47.3782, 8.5392],
		directions:
			'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=Parkhaus+Hauptbahnhof,+Zürich',
		link: 'https://www.pls-zh.ch/',
		updated: null
	},
	{
		id: 'fallback-opera',
		name: 'Opéra',
		address: 'Schillerstrasse 5',
		status: 'open',
		free: null,
		capacity: 310,
		coordinates: [47.3651, 8.5476],
		directions:
			'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=Parkhaus+Opéra,+Zürich',
		link: 'https://www.pls-zh.ch/',
		updated: null
	},
	{
		id: 'fallback-testrut',
		name: 'City Parking',
		address: 'Gessnerallee 14',
		status: 'open',
		free: null,
		capacity: 380,
		coordinates: [47.3731, 8.5339],
		directions:
			'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=City+Parking,+Zürich',
		link: 'https://www.pls-zh.ch/',
		updated: null
	},
	{
		id: 'fallback-ulemnia',
		name: 'Utoquai',
		address: 'Falkenstrasse 26',
		status: 'open',
		free: null,
		capacity: 180,
		coordinates: [47.3644, 8.5471],
		directions:
			'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=Parkhaus+Utoquai,+Zürich',
		link: 'https://www.pls-zh.ch/',
		updated: null
	},
	{
		id: 'fallback-globus',
		name: 'Globus',
		address: 'Löwenstrasse 50',
		status: 'open',
		free: null,
		capacity: 220,
		coordinates: [47.3749, 8.5381],
		directions:
			'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=Parkhaus+Globus,+Zürich',
		link: 'https://www.pls-zh.ch/',
		updated: null
	},
	{
		id: 'fallback-bellevue',
		name: 'Bellevue',
		address: 'Theaterstrasse 8',
		status: 'open',
		free: null,
		capacity: 140,
		coordinates: [47.3669, 8.5452],
		directions:
			'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=Parkhaus+Bellevue,+Zürich',
		link: 'https://www.pls-zh.ch/',
		updated: null
	},
	{
		id: 'fallback-stadelhofen',
		name: 'Stadelhofen',
		address: 'Othmarstrasse 3',
		status: 'open',
		free: null,
		capacity: 260,
		coordinates: [47.3664, 8.5486],
		directions:
			'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=Parkhaus+Stadelhofen,+Zürich',
		link: 'https://www.pls-zh.ch/',
		updated: null
	},
	{
		id: 'fallback-talacker',
		name: 'Talacker',
		address: 'Talacker 41',
		status: 'open',
		free: null,
		capacity: 200,
		coordinates: [47.3716, 8.5368],
		directions:
			'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=Parkhaus+Talacker,+Zürich',
		link: 'https://www.pls-zh.ch/',
		updated: null
	},
	{
		id: 'fallback-sia',
		name: 'Sihlcity',
		address: 'Kalanderplatz 1',
		status: 'open',
		free: null,
		capacity: 900,
		coordinates: [47.3582, 8.5228],
		directions:
			'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=Parkhaus+Sihlcity,+Zürich',
		link: 'https://www.pls-zh.ch/',
		updated: null
	},
	{
		id: 'fallback-hardau',
		name: 'Hardau',
		address: 'Bullingerstrasse 73',
		status: 'open',
		free: null,
		capacity: 350,
		coordinates: [47.3856, 8.5158],
		directions:
			'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=Parkhaus+Hardau,+Zürich',
		link: 'https://www.pls-zh.ch/',
		updated: null
	}
];
