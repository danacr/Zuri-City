/** Product voice: concrete Zürich, calm confidence — never “interactive city” filler. */
export const title = 'Züri City — Live map of Zürich';
export const description =
	'Zürich on a live 3D map: traffic on real streets, solid buildings, open places, aircraft overhead, and parking capacity always visible.';

export function structuredData(siteUrl: string) {
	return JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'WebSite',
				'@id': `${siteUrl}#website`,
				name: 'Züri City',
				alternateName: ['Züri City Map', 'Live map of Zürich'],
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
					'Requires an internet connection. Location features need HTTPS and permission when used.',
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
