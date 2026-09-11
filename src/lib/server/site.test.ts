import { expect, it } from 'vitest';
import { canonicalMetadata as siteMetadata, structuredData } from '../seo';

it('indexes only the canonical production domain', () => {
	expect(siteMetadata(new URL('https://zuri.city/'))).toEqual({
		siteUrl: 'https://zuri.city/',
		indexable: true
	});
	expect(siteMetadata(new URL('https://localhost:5173/')).indexable).toBe(false);
	expect(siteMetadata(new URL('https://preview.example/')).indexable).toBe(false);
});
it('produces valid structured data with the canonical website and author', () => {
	const schema = JSON.parse(structuredData('https://zuri.city/'));
	expect(schema['@graph'][0].url).toBe('https://zuri.city/');
	expect(schema['@graph'][1].author.url).toBe('https://dan.cv');
	expect(structuredData('https://example.com/<script>')).not.toContain('<script>');
});
