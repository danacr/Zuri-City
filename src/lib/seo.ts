export const title = 'Parking in Zürich – Free Spaces & Garage Map | Züri Parking';
export const description =
	'Find parking in Zürich with current free spaces, total garage capacity and a nearby parking map. Check full or closed garages and get driving directions.';
export function structuredData(siteUrl: string) {
	return JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'WebSite',
				'@id': `${siteUrl}#website`,
				name: 'Züri Parking',
				alternateName: 'Züri City Parking',
				url: siteUrl,
				inLanguage: 'en',
				description
			},
			{
				'@type': 'WebApplication',
				'@id': `${siteUrl}#app`,
				name: 'Züri Parking',
				url: siteUrl,
				description,
				applicationCategory: 'TravelApplication',
				operatingSystem: 'Any',
				browserRequirements:
					'Requires an internet connection. Location mode requires HTTPS and location permission.',
				author: { '@type': 'Person', name: 'dan.cv', url: 'https://dan.cv' },
				isPartOf: { '@id': `${siteUrl}#website` }
			}
		]
	}).replace(/</g, '\\u003c');
}

export function canonicalMetadata(
	requestUrl: URL,
	configured = 'https://zuri.city',
	development = false
) {
	const siteUrl = new URL('/', configured).href;
	return { siteUrl, indexable: !development && new URL(siteUrl).origin === requestUrl.origin };
}
