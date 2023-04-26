# Zuri Parking

[pls-zh.ch](https://www.pls-zh.ch/) is a great website, but it is not mobile optimized. This project uses its rss feed to feed a mobile version of it.

What started from a WebAssembly experiment ended up into just another svelte project.

The fetch request from WebAssembly fo the url [pls-zh.ch/plsFeed/rss](pls-zh.ch/plsFeed/rss) returns an unauthorized pages (Cookies and cross origin issue).

This is why I needed a server page load, which is not the point of wasm.

Also, cloudflare did not work because of [stackoverflow.com/a/73222998](stackoverflow.com/a/73222998)


Based on [How SvelteKit makes type-safe data fetching easier and better!](https://dev.to/asheeshh/how-sveltekit-makes-type-safe-data-fetching-easier-and-better-1g7k)
and [rss-parser](https://www.npmjs.com/package/rss-parser)

## Developing

```bash
npm run dev

# or to expose on the network
vite build --host
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.