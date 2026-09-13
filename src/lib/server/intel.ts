import { ZURICH_CAMERAS } from '$lib/intel/cameras';
import { inferFlightSize } from '$lib/intel/aircraftIcons';
import {
	ZRH_BBOX,
	type Flight,
	type IntelSnapshot,
	type Quake
} from '$lib/intel/types';
import { loadSwissTraffic } from '$lib/server/swissTraffic';

type AdsbAircraft = {
	hex?: string;
	flight?: string;
	lat?: number;
	lon?: number;
	alt_baro?: number | 'ground';
	track?: number;
	gs?: number;
	r?: string;
	t?: string;
	category?: string;
	desc?: string;
};

function parseFlight(item: AdsbAircraft): Flight | null {
	if (item.lat == null || item.lon == null) return null;
	const onGround = item.alt_baro === 'ground' || item.alt_baro === 0;
	const altitudeFt =
		typeof item.alt_baro === 'number' ? Math.round(item.alt_baro) : onGround ? 0 : null;
	const typeCode = (item.t || '').trim() || null;
	const speedKts = item.gs ?? null;
	return {
		id: item.hex || `${item.lat.toFixed(3)}-${item.lon.toFixed(3)}`,
		callsign: (item.flight || item.r || 'UNKN').trim() || 'UNKN',
		lat: item.lat,
		lon: item.lon,
		altitudeFt,
		heading: item.track ?? null,
		speedKts,
		onGround,
		typeCode,
		size: inferFlightSize({
			category: item.category,
			typeCode,
			speedKts,
			altitudeFt,
			onGround
		})
	};
}

export async function loadFlights(fetchFn: typeof fetch): Promise<{
	flights: Flight[];
	error: string;
}> {
	const { lat, lon, radiusNm } = ZRH_BBOX;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 8000);
	try {
		const response = await fetchFn(
			`https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/${radiusNm}`,
			{
				signal: controller.signal,
				headers: {
					accept: 'application/json',
					'user-agent': 'ZuriCity/1.0 (interactive Zürich city)'
				}
			}
		);
		if (!response.ok) throw new Error(`adsb ${response.status}`);
		const payload = (await response.json()) as { ac?: AdsbAircraft[] };
		const flights = (payload.ac || [])
			.map(parseFlight)
			.filter((flight): flight is Flight => flight !== null)
			.slice(0, 120);
		return { flights, error: '' };
	} catch {
		return { flights: [], error: 'Live aircraft feed unavailable — retry shortly.' };
	} finally {
		clearTimeout(timer);
	}
}

export async function loadQuakes(fetchFn: typeof fetch): Promise<{
	quakes: Quake[];
	error: string;
}> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 8000);
	try {
		const response = await fetchFn(
			'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
			{ signal: controller.signal }
		);
		if (!response.ok) throw new Error(`usgs ${response.status}`);
		const payload = (await response.json()) as {
			features?: {
				id: string;
				properties: { mag: number; place: string; time: number };
				geometry: { coordinates: [number, number, number] };
			}[];
		};
		const quakes = (payload.features || [])
			.map((feature) => ({
				id: feature.id,
				mag: feature.properties.mag,
				place: feature.properties.place,
				lon: feature.geometry.coordinates[0],
				lat: feature.geometry.coordinates[1],
				depthKm: feature.geometry.coordinates[2],
				time: new Date(feature.properties.time).toISOString()
			}))
			.filter((quake) => quake.lat > 45 && quake.lat < 49 && quake.lon > 5 && quake.lon < 12)
			.slice(0, 40);
		return { quakes, error: '' };
	} catch {
		return { quakes: [], error: 'Earthquake feed unavailable.' };
	} finally {
		clearTimeout(timer);
	}
}

export async function loadIntelSnapshot(fetchFn: typeof fetch): Promise<IntelSnapshot> {
	const [flightsResult, quakesResult, trafficResult] = await Promise.all([
		loadFlights(fetchFn),
		loadQuakes(fetchFn),
		loadSwissTraffic(fetchFn)
	]);
	const trafficNote =
		trafficResult.source === 'astra-datex' && trafficResult.traffic.length
			? `Live traffic: ${trafficResult.traffic.length} ASTRA DATEX counters in the Zürich bowl (opentransportdata.swiss).`
			: trafficResult.error ||
				'Live traffic: ASTRA DATEX (set OPENTRANSPORTDATA_API_KEY). No fake road-name colors.';
	const notes = [
		flightsResult.error,
		quakesResult.error,
		trafficNote,
		'CCTV stills are live ASTRA Mobcam JPEGs (proxied + validated). Map pins are approximate corridor placements.',
		'Aircraft are live ADS-B (adsb.lol). Tap “Find aircraft” or enable Aircraft — most contacts are outside the city bowl.',
		'Basemap is SWISSIMAGE (swisstopo) with solid 3D building masses (keyless). Photoreal street façades need a commercial 3D-tiles key.'
	].filter(Boolean);

	return {
		flights: flightsResult.flights,
		cameras: ZURICH_CAMERAS,
		traffic: trafficResult.traffic,
		quakes: quakesResult.quakes,
		fetchedAt: new Date().toISOString(),
		notes
	};
}
