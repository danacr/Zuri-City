import type { LayoutServerLoad } from './$types';
import { siteMetadata } from '$lib/server/site';
export const load: LayoutServerLoad = ({ url }) => siteMetadata(url);
