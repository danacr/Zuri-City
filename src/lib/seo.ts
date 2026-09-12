export const title = 'Züri City – The Interactive City';
export const description =
	'Explore Zürich as the interactive city: traffic on real roads, 3D buildings, open places, aircraft and CCTV — with live parking one tap away.';

export function structuredData(siteUrl: string) {
	return JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'WebSite',
				'@id': `${siteUrl}#website`,
				name: 'Züri City',
				alternateName: ['Züri Parking', 'Züri City Parking'],
				url: siteUrl,
				inLanguage: 'en',
				description
			},
			{
				'@type': 'WebApplication',
				'@id': `${siteUrl}#app`,
				name: 'Züri City',
				url: siteUrl,
				description,
				applicationCategory: 'TravelApplication',
				operatingSystem: 'Any',
				browserRequirements:
					'Requires an internet connection. Location and parking features require HTTPS and location permission when used.',
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
