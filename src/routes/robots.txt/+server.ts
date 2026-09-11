import type { RequestHandler } from './$types';
import { siteMetadata } from '$lib/server/site';
export const config = { runtime: 'nodejs18.x', regions: ['fra1'] };
export const GET: RequestHandler = ({ url }) => {
	const { siteUrl, indexable } = siteMetadata(url);
	return new Response(
		`User-agent: *\n${indexable ? `Allow: /\nSitemap: ${siteUrl}sitemap.xml` : 'Disallow: /'}\n`,
		{ headers: { 'content-type': 'text/plain; charset=utf-8' } }
	);
};
