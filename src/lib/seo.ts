export const title = 'Züri City – Walkable 3D Zürich Map of Places & Parking';
export const description =
	'Explore a virtual Zürich: walk a 3D city map of open stores, restaurants and attractions, and toggle live parking when you need it.';

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
