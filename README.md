# Züri City Parking

Find parking in Zürich from your phone. [Züri City Parking](https://zuri.city/)
is a mobile-friendly SvelteKit app powered by the
[Parkleitsystem Zürich](https://www.pls-zh.ch/) RSS feed.

The original site is a useful resource; this project makes its parking information
easier to browse on a small screen.

## What it does

- Shows available spaces and total capacity, with full, closed, and unknown garages grouped separately.
- Lets you search by garage or street, or use your location to find nearby parking on a map.
- Fetches fresh parking data on page load and when you tap **Refresh**.
- Supports light and dark mode, with a toggle that remembers your preference.
- Can be added to your home screen as a web app.

## How it started

What started as a WebAssembly experiment ended up as just another Svelte project.

Fetching the [RSS feed](https://www.pls-zh.ch/plsFeed/rss) from WebAssembly ran into
cookies and cross-origin issues, returning an unauthorized page. Fetching on the
server solved that problem, but took away the reason to use WebAssembly in the
first place. An early Cloudflare deployment attempt also ran into
[this issue](https://stackoverflow.com/a/73222998).

The initial implementation drew on
[How SvelteKit makes type-safe data fetching easier and better!](https://dev.to/asheeshh/how-sveltekit-makes-type-safe-data-fetching-easier-and-better-1g7k)
and [rss-parser](https://www.npmjs.com/package/rss-parser).
Today, the app uses SvelteKit, TypeScript, and Leaflet, and deploys to Vercel.

## Developing

Use Node.js **24.x**, npm, and OpenSSL, then run:

```bash
npm ci
npm run dev
```

The development server uses HTTPS and is exposed on your local network, so you can
try it on your phone. Follow the certificate setup in [CODEX.md](CODEX.md) to
trust the local connection and enable location access.

## Building

Create and preview a production build:

```bash
npm run build
npm run preview
```

For detailed setup, checks, deployment notes, and implementation guidance, see
[CODEX.md](CODEX.md).
