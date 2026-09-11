import { dev } from '$app/environment';
import { env } from '$env/dynamic/public';
import { canonicalMetadata } from '../seo';

export function siteMetadata(requestUrl: URL) {
	return canonicalMetadata(requestUrl, env.PUBLIC_SITE_URL || 'https://zuri.city', dev);
}
