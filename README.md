# create-svelte

what started from a webassembly experiment ended up into just another svelte project
the fetch request from webassembly fo the url https://www.pls-zh.ch/plsFeed/rss returns an unauthorized pages (cross origin issue and cookies)

so we needed a server page load, which is not the point of wasm, and then cloudflare did not work because of:

## Creating a project

based on https://dev.to/asheeshh/how-sveltekit-makes-type-safe-data-fetching-easier-and-better-1g7k
and
https://www.npmjs.com/package/rss-parser

Cloudflare does not work: https://stackoverflow.com/questions/73178856/sveltekit-packages-not-being-able-to-access-node-functions

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:



```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open

# or to expose on the network
vite build --host
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.
