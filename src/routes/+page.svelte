<script lang="ts">
	import { title, description, structuredData } from '$lib/seo';
	import CityExperience from '$lib/shell/CityExperience.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
	$: jsonLd = `<script type="application/ld+json">${structuredData(data.siteUrl)}<${'/'}script>`;
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={data.siteUrl} />
	<meta
		name="robots"
		content={data.indexable ? 'index, follow, max-image-preview:large' : 'noindex, nofollow'}
	/>
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Züri City" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={data.siteUrl} />
	<meta property="og:image" content={`${data.siteUrl}android-chrome-512x512.png`} />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	{@html jsonLd}
</svelte:head>

<CityExperience {data} />
