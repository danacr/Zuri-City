import { evaluateOpenNow, openBadge } from '$lib/city/openingHours';
import type { Place, PlaceCategory } from './types';

function place(
	partial: Omit<Place, 'isOpen' | 'openingHours' | 'openHint'> & {
		openingHours?: string | null;
		openHint?: string;
	}
): Place {
	const openingHours = partial.openingHours ?? null;
	const isOpen = evaluateOpenNow(openingHours);
	return {
		...partial,
		openingHours,
		isOpen,
		openHint: partial.openHint || (openingHours ? openBadge(isOpen) + (openingHours ? ` · ${openingHours}` : '') : openBadge(isOpen))
	};
}

/** Curated Zürich highlights — used when Overpass is slow, and merged as seeds. */
export const FALLBACK_PLACES: Place[] = [
	place({
		id: 'grossmuenster',
		name: 'Grossmünster',
		category: 'sights',
		lat: 47.3701,
		lon: 8.5441,
		subtitle: 'Romanesque twin towers above the Limmat',
		openingHours: 'Mo-Sa 10:00-17:00; Su 12:30-17:00',
		tags: ['landmark', 'church']
	}),
	place({
		id: 'fraumuenster',
		name: 'Fraumünster',
		category: 'sights',
		lat: 47.3697,
		lon: 8.5412,
		subtitle: 'Chagall windows on Münsterhof',
		openingHours: 'Mo-Sa 10:00-18:00; Su 10:00-18:00',
		tags: ['church', 'art']
	}),
	place({
		id: 'lindenhof',
		name: 'Lindenhof',
		category: 'outdoors',
		lat: 47.373,
		lon: 8.5408,
		subtitle: 'Hilltop park with old-town overlook',
		openingHours: '24/7',
		tags: ['viewpoint', 'park']
	}),
	place({
		id: 'kunsthaus',
		name: 'Kunsthaus Zürich',
		category: 'culture',
		lat: 47.3704,
		lon: 8.5486,
		subtitle: 'Major art museum by Heimplatz',
		openingHours: 'Tu-Fr 10:00-18:00; Sa-Su 10:00-17:00; Mo off',
		tags: ['museum', 'art']
	}),
	place({
		id: 'landesmuseum',
		name: 'Swiss National Museum',
		category: 'culture',
		lat: 47.3792,
		lon: 8.5402,
		subtitle: 'Castle-like museum at the main station',
		openingHours: 'Tu-Su 10:00-17:00; Mo off',
		tags: ['museum', 'history']
	}),
	place({
		id: 'oper',
		name: 'Zürich Opera House',
		category: 'culture',
		lat: 47.3651,
		lon: 8.5471,
		subtitle: 'Belle Époque house on Sechseläutenplatz',
		openHint: 'Box office hours vary',
		tags: ['theatre']
	}),
	place({
		id: 'bahnhofstrasse',
		name: 'Bahnhofstrasse',
		category: 'shop',
		lat: 47.3745,
		lon: 8.5388,
		subtitle: 'Flagship shopping spine from HB to the lake',
		openingHours: 'Mo-Fr 09:00-20:00; Sa 09:00-18:00',
		tags: ['shopping']
	}),
	place({
		id: 'globus',
		name: 'Globus Zürich',
		category: 'shop',
		lat: 47.3748,
		lon: 8.5396,
		subtitle: 'Department store on Bahnhofstrasse',
		openingHours: 'Mo-Sa 09:00-20:00',
		tags: ['department store']
	}),
	place({
		id: 'manor',
		name: 'Manor Zürich',
		category: 'shop',
		lat: 47.3741,
		lon: 8.5406,
		subtitle: 'City department store near Bahnhofstrasse',
		openingHours: 'Mo-Sa 09:00-20:00',
		tags: ['department store']
	}),
	place({
		id: 'spruengli',
		name: 'Confiserie Sprüngli',
		category: 'cafe',
		lat: 47.3699,
		lon: 8.5395,
		subtitle: 'Luxemburgerli café on Paradeplatz',
		openingHours: 'Mo-Fr 07:30-18:30; Sa 08:00-18:00; Su 09:00-17:00',
		tags: ['cafe', 'sweets']
	}),
	place({
		id: 'zeughauskeller',
		name: 'Zeughauskeller',
		category: 'food',
		lat: 47.3705,
		lon: 8.5402,
		subtitle: 'Classic Swiss hall near Paradeplatz',
		openingHours: 'Mo-Su 11:30-23:00',
		tags: ['swiss', 'beer hall']
	}),
	place({
		id: 'hiltl',
		name: 'Hiltl',
		category: 'food',
		lat: 47.3733,
		lon: 8.5368,
		subtitle: 'World’s oldest vegetarian restaurant',
		openingHours: 'Mo-Su 06:00-23:00',
		tags: ['vegetarian']
	}),
	place({
		id: 'cafe_schober',
		name: 'Café Schober',
		category: 'cafe',
		lat: 47.3718,
		lon: 8.5448,
		subtitle: 'Historic tea room in Niederdorf',
		openingHours: 'Mo-Su 08:00-18:30',
		tags: ['cafe']
	}),
	place({
		id: 'kronenhalle',
		name: 'Kronenhalle',
		category: 'food',
		lat: 47.3674,
		lon: 8.5468,
		subtitle: 'Iconic restaurant with art-lined rooms',
		openingHours: 'Mo-Su 12:00-00:00',
		tags: ['fine dining']
	}),
	place({
		id: 'buerkliplatz',
		name: 'Bürkliplatz',
		category: 'outdoors',
		lat: 47.3657,
		lon: 8.5408,
		subtitle: 'Lakefront square and boat piers',
		openingHours: '24/7',
		tags: ['lake', 'market']
	}),
	place({
		id: 'polyterrasse',
		name: 'Polyterrasse',
		category: 'outdoors',
		lat: 47.3764,
		lon: 8.5476,
		subtitle: 'ETH terrace with city panorama',
		openingHours: '24/7',
		tags: ['viewpoint']
	}),
	place({
		id: 'china_garden',
		name: 'Chinese Garden',
		category: 'outdoors',
		lat: 47.3555,
		lon: 8.5517,
		subtitle: 'Gifted garden beside Zürichhorn',
		openingHours: 'Mo-Su 11:00-19:00',
		tags: ['park', 'garden']
	}),
	place({
		id: 'rietberg',
		name: 'Museum Rietberg',
		category: 'culture',
		lat: 47.3589,
		lon: 8.5304,
		subtitle: 'Non-European art in Rieterpark',
		openingHours: 'Tu-Su 10:00-17:00; Mo off',
		tags: ['museum']
	}),
	place({
		id: 'viadukt',
		name: 'Im Viadukt',
		category: 'shop',
		lat: 47.3877,
		lon: 8.5258,
		subtitle: 'Arched market halls in District 5',
		openingHours: 'Tu-Fr 10:00-19:00; Sa 09:00-17:00',
		tags: ['market', 'design']
	}),
	place({
		id: 'markthalle',
		name: 'Markthalle Viadukt',
		category: 'food',
		lat: 47.3872,
		lon: 8.5252,
		subtitle: 'Food hall under the railway arches',
		openingHours: 'Mo-Sa 08:00-20:00; Su 10:00-18:00',
		tags: ['market', 'food hall']
	}),
	place({
		id: 'josefswiese',
		name: 'Josefswiese',
		category: 'outdoors',
		lat: 47.3895,
		lon: 8.5265,
		subtitle: 'Neighborhood park in Kreis 5',
		openingHours: '24/7',
		tags: ['park']
	}),
	place({
		id: 'hb',
		name: 'Zürich Hauptbahnhof',
		category: 'sights',
		lat: 47.3782,
		lon: 8.5402,
		subtitle: 'Main station and ShopVille undercroft',
		openingHours: '24/7',
		tags: ['transit']
	}),
	place({
		id: 'shopville',
		name: 'ShopVille',
		category: 'shop',
		lat: 47.3778,
		lon: 8.5401,
		subtitle: 'Underground mall beneath the main station',
		openingHours: 'Mo-Su 09:00-20:00',
		tags: ['mall']
	}),
	place({
		id: 'migros_hb',
		name: 'Migros Bahnhof',
		category: 'daily',
		lat: 47.3776,
		lon: 8.5404,
		subtitle: 'Supermarket under the main station',
		openingHours: 'Mo-Su 06:00-22:00',
		tags: ['supermarket']
	}),
	place({
		id: 'coop_hb',
		name: 'Coop City Bahnhofstrasse',
		category: 'daily',
		lat: 47.3756,
		lon: 8.5392,
		subtitle: 'City supermarket near HB',
		openingHours: 'Mo-Sa 09:00-20:00',
		tags: ['supermarket']
	}),
	place({
		id: 'pharmacy_bellevue',
		name: 'Bellevue Apotheke',
		category: 'daily',
		lat: 47.3668,
		lon: 8.5452,
		subtitle: 'Central pharmacy by Bellevue',
		openingHours: 'Mo-Fr 08:00-19:00; Sa 08:00-17:00',
		tags: ['pharmacy']
	}),
	place({
		id: 'niederdorf',
		name: 'Niederdorf',
		category: 'sights',
		lat: 47.3735,
		lon: 8.5445,
		subtitle: 'Laneway old town of cafés and boutiques',
		openingHours: '24/7',
		tags: ['old town']
	}),
	place({
		id: 'freitag',
		name: 'Freitag Flagship Tower',
		category: 'shop',
		lat: 47.3889,
		lon: 8.5156,
		subtitle: 'Stacked shipping-container shop',
		openingHours: 'Mo-Fr 11:00-19:00; Sa 10:00-18:00; Su 11:00-18:00',
		tags: ['design']
	}),
	place({
		id: 'enge',
		name: 'Lake Zürich Quays (Enge)',
		category: 'outdoors',
		lat: 47.3635,
		lon: 8.5345,
		subtitle: 'Tree-lined promenade toward Mythenquai',
		openingHours: '24/7',
		tags: ['lake', 'walk']
	}),
	place({
		id: 'ueto',
		name: 'Uetliberg viewpoint',
		category: 'outdoors',
		lat: 47.3496,
		lon: 8.4914,
		subtitle: 'City mountain lookout above Zürich',
		openingHours: '24/7',
		tags: ['viewpoint', 'hike']
	}),
	place({
		id: 'bar_odeson',
		name: 'Bar Odeon',
		category: 'nightlife',
		lat: 47.3662,
		lon: 8.5464,
		subtitle: 'Grand café-bar on Bellevue',
		openingHours: 'Mo-Th 07:00-00:00; Fr-Sa 07:00-02:00; Su 07:00-00:00',
		tags: ['bar', 'cafe']
	}),
	place({
		id: 'rimini',
		name: 'Rimini Bar',
		category: 'nightlife',
		lat: 47.3739,
		lon: 8.5419,
		subtitle: 'Summer bar by the Männerbad',
		openingHours: 'Mo-Su 16:00-00:00',
		tags: ['bar', 'seasonal']
	}),
	place({
		id: 'frauengerberbad',
		name: 'Frauenbad Stadthausquai',
		category: 'wellness',
		lat: 47.3686,
		lon: 8.5416,
		subtitle: 'Historic women-only river bath',
		openingHours: 'Mo-Su 09:00-20:00',
		tags: ['badi', 'bath']
	}),
	place({
		id: 'maennerbad',
		name: 'Männerbad Schanzengraben',
		category: 'wellness',
		lat: 47.3737,
		lon: 8.5417,
		subtitle: 'River bath beside the Schanzengraben',
		openingHours: 'Mo-Su 09:00-20:00',
		tags: ['badi', 'bath']
	}),
	place({
		id: 'flussbad_oberer',
		name: 'Flussbad Oberer Letten',
		category: 'wellness',
		lat: 47.3882,
		lon: 8.5315,
		subtitle: 'Popular Limmat swim spot',
		openingHours: 'Mo-Su 09:00-20:00',
		tags: ['badi', 'swim']
	}),
	place({
		id: 'seebad_enge',
		name: 'Seebad Enge',
		category: 'wellness',
		lat: 47.3628,
		lon: 8.5362,
		subtitle: 'Lake swimming club near Enge',
		openingHours: 'Mo-Su 09:00-20:00',
		tags: ['badi', 'lake']
	}),
	place({
		id: 'thermalbad',
		name: 'Thermalbad & Spa Zürich',
		category: 'wellness',
		lat: 47.3836,
		lon: 8.5294,
		subtitle: 'Rooftop thermal baths in District 5',
		openingHours: 'Mo-Su 08:00-22:00',
		tags: ['spa', 'thermal']
	}),
	place({
		id: 'fitnesspark_hb',
		name: 'Fitnesspark HB',
		category: 'wellness',
		lat: 47.3771,
		lon: 8.5408,
		subtitle: 'Gym complex under the main station',
		openingHours: 'Mo-Fr 06:00-22:30; Sa-Su 08:00-20:00',
		tags: ['fitness']
	}),
	place({
		id: 'central_plaza',
		name: 'Central Plaza Hotel',
		category: 'stay',
		lat: 47.3768,
		lon: 8.5436,
		subtitle: 'Hotel at Central tram hub',
		openingHours: '24/7',
		tags: ['hotel']
	}),
	place({
		id: 'storchen',
		name: 'Hotel Storchen',
		category: 'stay',
		lat: 47.3714,
		lon: 8.5422,
		subtitle: 'Riverside hotel facing the Limmat',
		openingHours: '24/7',
		tags: ['hotel']
	}),
	place({
		id: 'widder',
		name: 'Widder Hotel',
		category: 'stay',
		lat: 47.3724,
		lon: 8.5401,
		subtitle: 'Boutique stay in the old town lanes',
		openingHours: '24/7',
		tags: ['hotel']
	}),
	place({
		id: '25hours',
		name: '25hours Hotel Zürich West',
		category: 'stay',
		lat: 47.3896,
		lon: 8.5178,
		subtitle: 'Design hotel in Zürich West',
		openingHours: '24/7',
		tags: ['hotel']
	}),
	place({
		id: 'bierkeller',
		name: 'Clouds Restaurant',
		category: 'food',
		lat: 47.3864,
		lon: 8.5172,
		subtitle: 'Skyline dining atop Prime Tower',
		openingHours: 'Tu-Sa 11:30-14:00, 18:00-00:00; Su 11:30-14:00',
		tags: ['fine dining', 'view']
	}),
	place({
		id: 'les_halles',
		name: 'Les Halles',
		category: 'food',
		lat: 47.3884,
		lon: 8.5278,
		subtitle: 'Industrial brasserie in Kreis 5',
		openingHours: 'Mo-Su 11:00-00:00',
		tags: ['brasserie']
	}),
	place({
		id: 'maison_manesse',
		name: 'Maison Manesse',
		category: 'food',
		lat: 47.3806,
		lon: 8.5272,
		subtitle: 'Creative tasting menus in District 4',
		openingHours: 'Tu-Sa 18:00-00:00',
		tags: ['fine dining']
	}),
	place({
		id: 'babu',
		name: "Babu's",
		category: 'cafe',
		lat: 47.3742,
		lon: 8.5438,
		subtitle: 'All-day café near Predigerplatz',
		openingHours: 'Mo-Su 07:00-22:00',
		tags: ['cafe', 'brunch']
	}),
	place({
		id: 'vicafe_muensterhof',
		name: 'viCafé Münsterhof',
		category: 'cafe',
		lat: 47.3701,
		lon: 8.5406,
		subtitle: 'Specialty coffee on Münsterhof',
		openingHours: 'Mo-Fr 07:00-19:00; Sa 08:00-18:00; Su 09:00-17:00',
		tags: ['coffee']
	}),
	place({
		id: 'branchli',
		name: 'Confiserie Teuscher',
		category: 'cafe',
		lat: 47.3712,
		lon: 8.5416,
		subtitle: 'Champagne truffles in the old town',
		openingHours: 'Mo-Sa 09:00-19:00',
		tags: ['chocolate']
	}),
	place({
		id: 'kaufleuten',
		name: 'Kaufleuten',
		category: 'nightlife',
		lat: 47.3728,
		lon: 8.5362,
		subtitle: 'Club and concert house near Paradeplatz',
		openingHours: 'Th-Sa 23:00-05:00',
		tags: ['club']
	}),
	place({
		id: 'hive',
		name: 'Hive Club',
		category: 'nightlife',
		lat: 47.3881,
		lon: 8.5186,
		subtitle: 'Late-night club in Zürich West',
		openingHours: 'Fr-Sa 23:00-06:00',
		tags: ['club']
	}),
	place({
		id: 'raza',
		name: 'Bar Raza',
		category: 'nightlife',
		lat: 47.3775,
		lon: 8.5275,
		subtitle: 'Neighborhood cocktail bar',
		openingHours: 'Mo-Sa 17:00-00:00',
		tags: ['bar']
	}),
	place({
		id: 'jelmoli',
		name: 'Jelmoli',
		category: 'shop',
		lat: 47.3746,
		lon: 8.5378,
		subtitle: 'Historic department store',
		openingHours: 'Mo-Fr 09:00-20:00; Sa 09:00-18:00',
		tags: ['department store']
	}),
	place({
		id: 'pkz',
		name: 'PKZ Bahnhofstrasse',
		category: 'shop',
		lat: 47.3732,
		lon: 8.5386,
		subtitle: 'Swiss fashion flagship',
		openingHours: 'Mo-Fr 09:00-20:00; Sa 09:00-18:00',
		tags: ['fashion']
	}),
	place({
		id: 'orell',
		name: 'Orell Füssli Bahnhofstrasse',
		category: 'shop',
		lat: 47.3751,
		lon: 8.5384,
		subtitle: 'Large bookstore near HB',
		openingHours: 'Mo-Fr 09:00-20:00; Sa 09:00-18:00',
		tags: ['books']
	}),
	place({
		id: 'manor_food',
		name: 'Manor Food Bahnhofstrasse',
		category: 'daily',
		lat: 47.374,
		lon: 8.5404,
		subtitle: 'Grocery hall under Manor',
		openingHours: 'Mo-Sa 09:00-20:00',
		tags: ['supermarket']
	}),
	place({
		id: 'migros_city',
		name: 'Migros City',
		category: 'daily',
		lat: 47.3749,
		lon: 8.5382,
		subtitle: 'Downtown supermarket',
		openingHours: 'Mo-Sa 08:00-20:00',
		tags: ['supermarket']
	}),
	place({
		id: 'coop_paradeplatz',
		name: 'Coop Pronto Paradeplatz',
		category: 'daily',
		lat: 47.3697,
		lon: 8.5391,
		subtitle: 'Late convenience near Paradeplatz',
		openingHours: 'Mo-Su 06:00-22:00',
		tags: ['convenience']
	}),
	place({
		id: 'apotheke_hb',
		name: 'Bahnhof Apotheke',
		category: 'daily',
		lat: 47.3779,
		lon: 8.5405,
		subtitle: 'Station pharmacy with long hours',
		openingHours: 'Mo-Su 07:00-21:00',
		tags: ['pharmacy']
	}),
	place({
		id: 'post_hb',
		name: 'Die Post Zürich HB',
		category: 'daily',
		lat: 47.378,
		lon: 8.5396,
		subtitle: 'Main post office at the station',
		openingHours: 'Mo-Fr 08:00-18:30; Sa 08:30-16:00',
		tags: ['post']
	}),
	place({
		id: 'fraumuenster_platz',
		name: 'Münsterhof',
		category: 'sights',
		lat: 47.3699,
		lon: 8.5409,
		subtitle: 'Historic square by Fraumünster',
		openingHours: '24/7',
		tags: ['square']
	}),
	place({
		id: 'bellevue',
		name: 'Bellevue',
		category: 'sights',
		lat: 47.3669,
		lon: 8.5451,
		subtitle: 'Lakeside traffic hub and tram knot',
		openingHours: '24/7',
		tags: ['square']
	}),
	place({
		id: 'sechelsaeutenplatz',
		name: 'Sechseläutenplatz',
		category: 'outdoors',
		lat: 47.3658,
		lon: 8.5466,
		subtitle: 'Open plaza by the Opera House',
		openingHours: '24/7',
		tags: ['plaza']
	}),
	place({
		id: 'plaza_opernhaus',
		name: 'Zürichhorn Park',
		category: 'outdoors',
		lat: 47.3548,
		lon: 8.5512,
		subtitle: 'Lakeside lawns toward the Chinese Garden',
		openingHours: '24/7',
		tags: ['park', 'lake']
	}),
	place({
		id: 'platzspitz',
		name: 'Platzspitz Park',
		category: 'outdoors',
		lat: 47.3812,
		lon: 8.5398,
		subtitle: 'Park where Limmat and Sihl meet',
		openingHours: '24/7',
		tags: ['park']
	}),
	place({
		id: 'migros_museum',
		name: 'Migros Museum für Gegenwartskunst',
		category: 'culture',
		lat: 47.3892,
		lon: 8.5182,
		subtitle: 'Contemporary art in Zürich West',
		openingHours: 'Tu-Fr 11:00-18:00; Sa-Su 10:00-17:00; Mo off',
		tags: ['museum', 'art']
	}),
	place({
		id: 'schiffbau',
		name: 'Schiffbau',
		category: 'culture',
		lat: 47.3898,
		lon: 8.5189,
		subtitle: 'Theatre and jazz stages in a former shipyard',
		openHint: 'Box office hours vary',
		tags: ['theatre']
	}),
	place({
		id: 'schauspielhaus',
		name: 'Schauspielhaus Zürich',
		category: 'culture',
		lat: 47.3702,
		lon: 8.5492,
		subtitle: 'City drama house by Heimplatz',
		openHint: 'Box office hours vary',
		tags: ['theatre']
	}),
	place({
		id: 'buerkli_market',
		name: 'Bürkliplatz Market',
		category: 'daily',
		lat: 47.3659,
		lon: 8.5405,
		subtitle: 'Plant and flea markets on the lakeside',
		openingHours: 'Sa 06:00-14:00',
		tags: ['market']
	}),
	place({
		id: 'helvetiaplatz',
		name: 'Helvetiaplatz',
		category: 'sights',
		lat: 47.3748,
		lon: 8.5268,
		subtitle: 'District 4 square and tram stop',
		openingHours: '24/7',
		tags: ['square']
	}),
	place({
		id: 'langstrasse',
		name: 'Langstrasse',
		category: 'nightlife',
		lat: 47.3788,
		lon: 8.5288,
		subtitle: 'Nightlife corridor across Districts 4 & 5',
		openingHours: '24/7',
		tags: ['nightlife']
	}),
	place({
		id: 'publique',
		name: 'Restaurant Publique',
		category: 'food',
		lat: 47.3756,
		lon: 8.5284,
		subtitle: 'Neighborhood kitchen near Helvetiaplatz',
		openingHours: 'Tu-Sa 11:30-14:00, 18:00-23:00',
		tags: ['swiss']
	}),
	place({
		id: 'blanc',
		name: 'Blanc',
		category: 'cafe',
		lat: 47.3888,
		lon: 8.5204,
		subtitle: 'Bright café in Zürich West',
		openingHours: 'Mo-Fr 07:30-18:00; Sa 09:00-17:00',
		tags: ['cafe']
	}),
	place({
		id: 'bike_zueri',
		name: 'PubliBike Zürich HB',
		category: 'daily',
		lat: 47.3774,
		lon: 8.5398,
		subtitle: 'Bike share station at the main station',
		openingHours: '24/7',
		tags: ['bike']
	}),
	place({
		id: 'andaz',
		name: 'Andaz Zürich',
		category: 'stay',
		lat: 47.3869,
		lon: 8.5176,
		subtitle: 'Hyatt lifestyle hotel by Prime Tower',
		openingHours: '24/7',
		tags: ['hotel']
	}),
	place({
		id: 'motel_one',
		name: 'Motel One Zürich',
		category: 'stay',
		lat: 47.3786,
		lon: 8.5324,
		subtitle: 'Design-budget stay near Langstrasse',
		openingHours: '24/7',
		tags: ['hotel']
	}),
	place({
		id: 'badi_mythenquai',
		name: 'Strandbad Mythenquai',
		category: 'wellness',
		lat: 47.3542,
		lon: 8.5368,
		subtitle: 'Large lakefront swimming beach',
		openingHours: 'Mo-Su 09:00-20:00',
		tags: ['badi', 'lake']
	}),
	place({
		id: 'badi_tiefenbrunnen',
		name: 'Strandbad Tiefenbrunnen',
		category: 'wellness',
		lat: 47.3518,
		lon: 8.5594,
		subtitle: 'East-shore lake bath with lawns',
		openingHours: 'Mo-Su 09:00-20:00',
		tags: ['badi', 'lake']
	}),
	place({
		id: 'coiffure_paradeplatz',
		name: 'Coiffure Christa',
		category: 'beauty',
		lat: 47.3704,
		lon: 8.5398,
		subtitle: 'Hair salon near Paradeplatz',
		openingHours: 'Tu-Fr 09:00-18:30; Sa 09:00-16:00',
		tags: ['hairdresser']
	}),
	place({
		id: 'nails_niederdorf',
		name: 'Nails Niederdorf',
		category: 'beauty',
		lat: 47.3728,
		lon: 8.5442,
		subtitle: 'Nail studio in the old town lanes',
		openingHours: 'Mo-Sa 10:00-19:00',
		tags: ['nails']
	}),
	place({
		id: 'beauty_bahnhofstrasse',
		name: 'The Body Shop Bahnhofstrasse',
		category: 'beauty',
		lat: 47.3738,
		lon: 8.5389,
		subtitle: 'Beauty and bodycare on Bahnhofstrasse',
		openingHours: 'Mo-Fr 09:00-20:00; Sa 09:00-18:00',
		tags: ['cosmetics']
	}),
	place({
		id: 'spa_beauty_west',
		name: 'Beauty Spa Zürich West',
		category: 'beauty',
		lat: 47.3886,
		lon: 8.5198,
		subtitle: 'Treatments and salon in Zürich West',
		openingHours: 'Tu-Fr 10:00-19:00; Sa 10:00-17:00',
		tags: ['beauty', 'spa']
	}),
	place({
		id: 'marionnaud_hb',
		name: 'Marionnaud ShopVille',
		category: 'beauty',
		lat: 47.3777,
		lon: 8.5402,
		subtitle: 'Perfumery under the main station',
		openingHours: 'Mo-Su 09:00-20:00',
		tags: ['perfumery']
	}),
	place({
		id: 'douglas_bahnhof',
		name: 'Douglas Bahnhofstrasse',
		category: 'beauty',
		lat: 47.3754,
		lon: 8.5387,
		subtitle: 'Beauty retailer on Bahnhofstrasse',
		openingHours: 'Mo-Fr 09:00-20:00; Sa 09:00-18:00',
		tags: ['cosmetics']
	}),
	place({
		id: 'nails_bellevue',
		name: 'Nail Bar Bellevue',
		category: 'beauty',
		lat: 47.3672,
		lon: 8.5454,
		subtitle: 'Nail salon near Bellevue',
		openingHours: 'Mo-Sa 10:00-19:00',
		tags: ['nails']
	}),
	place({
		id: 'coiffure_niederdorf',
		name: 'Coiffure Niederdorf',
		category: 'beauty',
		lat: 47.3732,
		lon: 8.5448,
		subtitle: 'Hair salon in the old town',
		openingHours: 'Tu-Fr 09:00-18:30; Sa 09:00-16:00',
		tags: ['hairdresser']
	}),
	place({
		id: 'lash_studio_west',
		name: 'Lash & Brow Studio West',
		category: 'beauty',
		lat: 47.3878,
		lon: 8.5206,
		subtitle: 'Beauty treatments in Zürich West',
		openingHours: 'Tu-Fr 10:00-19:00; Sa 10:00-17:00',
		tags: ['beauty', 'lashes']
	}),
	place({
		id: 'barber_langstrasse',
		name: 'Barber Langstrasse',
		category: 'beauty',
		lat: 47.3794,
		lon: 8.5294,
		subtitle: 'Barbershop on Langstrasse',
		openingHours: 'Mo-Sa 10:00-20:00',
		tags: ['hairdresser']
	})
];
