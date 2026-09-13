/**
 * Live Swiss road traffic via ASTRA DATEX II (opentransportdata.swiss).
 * Free key: https://api-manager.opentransportdata.swiss → set OPENTRANSPORTDATA_API_KEY.
 *
 * Replaces the old OpenMapTiles name/class hash that painted roads red/green at random.
 */
import { env } from '$env/dynamic/private';
import type { TrafficSegment } from '$lib/intel/types';

const COUNTERS_URL = 'https://api.opentransportdata.swiss/TDP/Soap_Datex2/TrafficCounters/Pull';
const SITES_ACTION =
	'http://opentransportdata.swiss/TDP/Soap_Datex2/Pull/v1/pullMeasurementSiteTable';
const DATA_ACTION = 'http://opentransportdata.swiss/TDP/Soap_Datex2/Pull/v1/pullMeasuredData';

/** Greater Zürich bowl — counters outside this bbox are ignored. */
const ZH_BBOX = { west: 8.35, south: 47.28, east: 8.72, north: 47.48 };

const SITES_SOAP = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <d2LogicalModel xmlns="http://datex2.eu/schema/2/2_0" modelBaseVersion="2"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
      <exchange>
        <supplierIdentification>
          <country>ch</country>
          <nationalIdentifier>zuri-city</nationalIdentifier>
        </supplierIdentification>
      </exchange>
    </d2LogicalModel>
  </soap:Body>
</soap:Envelope>`;

type Site = { id: string; name: string; lat: number; lon: number };
type CacheBox<T> = { at: number; value: T };

let sitesCache: CacheBox<Site[]> | null = null;
let measuresCache: CacheBox<TrafficSegment[]> | null = null;

/** Test-only — clears DATEX caches between Vitest cases. */
export function resetSwissTrafficCacheForTests() {
	sitesCache = null;
	measuresCache = null;
}

function apiKey(): string {
	return (env.OPENTRANSPORTDATA_API_KEY || env.OTD_API_KEY || '').trim();
}

function dataSoapBody(siteIds: string[]): string {
	const refs = siteIds
		.slice(0, 80)
		.map((id) => `            <measurementSiteReference id="${escapeXml(id)}"/>`)
		.join('\n');
	const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');
	return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <d2LogicalModel xmlns="http://datex2.eu/schema/2/2_0" modelBaseVersion="2"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
      <exchange>
        <supplierIdentification>
          <country>ch</country>
          <nationalIdentifier>zuri-city</nationalIdentifier>
        </supplierIdentification>
      </exchange>
      <payloadPublication xsi:type="GenericPublication" lang="de">
        <publicationTime>${now}</publicationTime>
        <publicationCreator>
          <country>ch</country>
          <nationalIdentifier>zuri-city</nationalIdentifier>
        </publicationCreator>
        <genericPublicationName>MeasuredDataFilter</genericPublicationName>
        <genericPublicationExtension>
          <measuredDataFilter>
            <measurementSiteTableReference targetClass="MeasurementSiteTable"
              id="OTD:TrafficData" version="0"/>
${refs}
          </measuredDataFilter>
        </genericPublicationExtension>
      </payloadPublication>
    </d2LogicalModel>
  </soap:Body>
</soap:Envelope>`;
}

function escapeXml(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

async function soapPost(
	fetchFn: typeof fetch,
	key: string,
	action: string,
	body: string
): Promise<string> {
	const response = await fetchFn(COUNTERS_URL, {
		method: 'POST',
		headers: {
			'content-type': 'text/xml; charset=utf-8',
			SOAPAction: action,
			Authorization: `Bearer ${key}`,
			'user-agent': 'ZuriCity/1.0 (https://zuri.city)',
			accept: 'text/xml'
		},
		body,
		cache: 'no-store'
	});
	if (response.status === 401 || response.status === 403) {
		throw new Error('ASTRA DATEX rejected the API key (401/403).');
	}
	if (!response.ok) {
		throw new Error(`ASTRA DATEX HTTP ${response.status}`);
	}
	return response.text();
}

/** Split DATEX site records without a full XML DOM (Node-safe). */
function parseSites(xml: string): Site[] {
	const sites: Site[] = [];
	const records = xml.split(/<measurementSiteRecord\b/i).slice(1);
	for (const chunk of records) {
		const block = chunk.slice(0, chunk.search(/<\/measurementSiteRecord>/i) + 1);
		const idMatch = block.match(/\bid="([^"]+)"/i);
		const id = idMatch?.[1];
		if (!id) continue;
		const lat = Number(block.match(/<latitude[^>]*>\s*([+-]?\d+(?:\.\d+)?)/i)?.[1]);
		const lon = Number(block.match(/<longitude[^>]*>\s*([+-]?\d+(?:\.\d+)?)/i)?.[1]);
		if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
		if (lon < ZH_BBOX.west || lon > ZH_BBOX.east || lat < ZH_BBOX.south || lat > ZH_BBOX.north) {
			continue;
		}
		const name =
			block.match(/<measurementSiteName[\s\S]*?<value[^>]*>\s*([^<]+)/i)?.[1]?.trim() ||
			block.match(/<measurementSiteName[^>]*>\s*([^<]+)/i)?.[1]?.trim() ||
			id;
		sites.push({ id, name, lat, lon });
	}
	return sites;
}

function levelFromSpeed(kmh: number | null): TrafficSegment['level'] | null {
	if (kmh == null || !Number.isFinite(kmh)) return null;
	if (kmh < 25) return 'jam';
	if (kmh < 55) return 'slow';
	return 'free';
}

/** ~180 m stub so counters read as corridor color, not a lonely pin. */
function stubAround(lon: number, lat: number): [number, number][] {
	return [
		[lon - 0.0012, lat - 0.00055],
		[lon + 0.0012, lat + 0.00055]
	];
}

function parseMeasurements(xml: string, sitesById: Map<string, Site>): TrafficSegment[] {
	const out: TrafficSegment[] = [];
	const blocks = xml.split(/<siteMeasurements\b/i).slice(1);
	for (const chunk of blocks) {
		const block = chunk.slice(0, chunk.search(/<\/siteMeasurements>/i) + 1);
		const id =
			block.match(/<measurementSiteReference[^>]*\bid="([^"]+)"/i)?.[1] ||
			block.match(/\bid="([^"]+)"[^>]*\/>/i)?.[1] ||
			'';
		const site = sitesById.get(id);
		if (!site) continue;

		let speed: number | null = null;
		for (const match of block.matchAll(/<speed[^>]*>\s*([+-]?\d+(?:\.\d+)?)/gi)) {
			const value = Number(match[1]);
			if (!Number.isFinite(value)) continue;
			speed = speed == null ? value : Math.max(speed, value);
		}
		const level = levelFromSpeed(speed);
		if (!level) continue;
		out.push({
			id: `astra-${id}`,
			name: site.name,
			coordinates: stubAround(site.lon, site.lat),
			level,
			modeled: false
		});
	}
	return out;
}

export async function loadSwissTraffic(fetchFn: typeof fetch): Promise<{
	traffic: TrafficSegment[];
	source: 'astra-datex' | 'unavailable';
	error: string;
}> {
	const key = apiKey();
	if (!key) {
		return {
			traffic: [],
			source: 'unavailable',
			error: 'Traffic unavailable.'
		};
	}

	const now = Date.now();
	if (measuresCache && now - measuresCache.at < 55_000) {
		return { traffic: measuresCache.value, source: 'astra-datex', error: '' };
	}

	try {
		if (!sitesCache || now - sitesCache.at > 86_400_000) {
			const sitesXml = await soapPost(fetchFn, key, SITES_ACTION, SITES_SOAP);
			sitesCache = { at: now, value: parseSites(sitesXml) };
		}
		const sites = sitesCache.value;
		if (!sites.length) {
			return {
				traffic: [],
				source: 'astra-datex',
				error: 'ASTRA returned no counters inside the Zürich bbox.'
			};
		}

		const sitesById = new Map(sites.map((site) => [site.id, site]));
		const dataXml = await soapPost(
			fetchFn,
			key,
			DATA_ACTION,
			dataSoapBody(sites.map((site) => site.id))
		);
		const traffic = parseMeasurements(dataXml, sitesById);
		measuresCache = { at: now, value: traffic };
		return { traffic, source: 'astra-datex', error: '' };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'ASTRA traffic unavailable';
		return { traffic: measuresCache?.value || [], source: 'unavailable', error: message };
	}
}
