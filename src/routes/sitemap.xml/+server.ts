import type { RequestHandler } from './$types';
import { siteMetadata } from '$lib/server/site';
export const config = { runtime: 'nodejs18.x', regions: ['fra1'] };
export const GET: RequestHandler = ({ url }) => {
	const { siteUrl, indexable } = siteMetadata(url);
	const escaped = siteUrl.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${
			indexable ? `<url><loc>${escaped}</loc></url>` : ''
		}</urlset>`,
		{ headers: { 'content-type': 'application/xml; charset=utf-8' } }
	);
};
