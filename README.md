# Züri City Parking

A mobile-friendly view of Zürich parking availability, built with SvelteKit,
TypeScript and Leaflet. Parking data comes from the
[Parkleitsystem Zürich RSS feed](https://www.pls-zh.ch/plsFeed/rss) and is fetched
on the server whenever the page loads.

## Runtime and toolchain

Use Node.js **24.x** locally and on Vercel. `.nvmrc`, `.node-version`, and
`package.json` declare this version; the Vercel adapter generates Node 24 functions.
If your Vercel project still selects Node 18, set **Settings → Build and Deployment
→ Node.js Version → 24.x**, then redeploy the upgraded commit.

The app uses Svelte 5, SvelteKit 2, Vite 8, Tailwind CSS 4, Vitest 5, ESLint 10,
and Prettier 3. TypeScript remains on the latest compatible 6.0 release because
SvelteKit and typescript-eslint do not yet support TypeScript 7. Leaflet and
rss-parser remain on their current stable releases. The unused Skeleton UI,
Cloudflare/auto adapters, and old PostCSS/ESLint integrations have been removed.
A scoped `cookie` override applies the compatible security fix required by
SvelteKit's transitive dependency; remove it when upstream adopts a fixed version.

## Getting started

Install **Node.js 24**, npm, and OpenSSL (with support for `req -addext`), then install the project dependencies:

```bash
nvm use # if you use nvm
npm ci
npm run dev
```

The development server uses **HTTPS only** and listens on all IPv4 interfaces (`0.0.0.0`). Open the
Local URL printed by Vite on your computer, or the Network URL on a phone or
another device connected to the same network. The default port is `5173`; Vite
may choose another port if it is already in use.

To choose a port:

```bash
npm run dev -- --port 3000
```

## Trust the local HTTPS certificate

On first start, Vite generates a project-local certificate authority and server
certificate in the ignored `.certs/` directory. Certificates cover localhost and
your current network IP addresses. Restart Vite after changing networks to update
the certificate. Open the **https://** URL printed by Vite; HTTP is not supported.

Trust `.certs/rootCA.crt` on each device you use for development:

- **macOS:** import it into Keychain Access, open the certificate, and set its SSL
  trust to Always Trust. Restart the browser if necessary.
- **iPhone/iPad:** AirDrop only `.certs/rootCA.crt` to your device. Install the
  downloaded profile in Settings, then go to **Settings → General → About →
  Certificate Trust Settings** and enable full trust for **Zuri City Local
  Development CA**. Open the HTTPS Network URL in Safari on the same Wi-Fi.

Trusting the certificate is required for Safari location access; simply bypassing
an untrusted-certificate warning is not sufficient. Keep the `*-key.pem` files
private; only transfer `rootCA.crt`. The app does not install trust automatically.
See [Apple's certificate trust instructions](https://support.apple.com/en-us/102390).

If you previously saw `ERR_SSL_PROTOCOL_ERROR`, stop the old HTTP dev server and
restart with `npm run dev`. If OpenSSL is missing on macOS, install it with
`brew install openssl` and ensure it is available on your PATH.

## Using the app

- **List view** contains every garage returned by the provider, with available garages in the main list, ordered by free spaces. Full, closed
  and unknown garages appear in a separate section below it.
- The map icon in the header requests browser location permission and switches
  to the map. It includes every garage with known coordinates and initially
  frames the closest garages; pan to explore the others. Tap the list icon to
  return to the complete list.
- Cards and map markers show **free / total** spaces. Open garages are green,
  full and closed garages are red, and unknown availability is grey.
- Tap the search icon in the header to search by garage or street. Tap it again
  (or press Escape) to collapse search and clear its filter. A notice below the
  results counts hidden matches and offers **Show all** to clear the search.
- Missing provider data is explicitly listed. Garages without coordinates stay
  in the list; a dash means an unavailable count, never zero.
- The list or map starts directly below the header. Garage counts, missing-data
  warnings, **Refresh**, installation and credits are below the results.
- Use **Refresh** to fetch the full list, capacity and coordinates again.

Location access requires a trusted secure connection and browser permission.
For local mobile testing, follow the certificate trust steps above.

Your location is used in the browser. Map tiles are loaded from OpenStreetMap.
Reload the page to refresh parking availability.

## Appearance and web app

The interface follows your device's light or dark appearance automatically,
including changes while the app is open.

Tap **Install web app** below the results to add Züri Parking as a web app. Browsers that
provide a native installation prompt open it directly. On iPhone and iPad, the
button explains how to use Safari's **Share → Add to Home Screen** action.
The button is hidden when the app is running in standalone mode.

The web app requires an internet connection; parking data is always fetched fresh.
Local installation and location access require trusting the development HTTPS
certificate as described above.

Credits in the app link to Parkleitsystem Zürich, OpenStreetMap contributors,
Leaflet, and the [project source and contributors](https://github.com/danacr/Zuri-City).

## Production build

```bash
npm run build
npm run preview
```

To expose the production preview on your network:

```bash
npm run preview -- --host 0.0.0.0
```

Local preview also uses HTTPS and the same local certificates.

The project uses the Vercel adapter for deployment. The preview command is for
checking the build locally.

## Checks and tests

```bash
npm run check
npm run test:unit -- --run
npm run lint
```

Browser tests use Playwright and start a production preview server automatically:

```bash
npx playwright install chromium
npm test
```

Run `npm run format` to format the project.

## Dynamic parking data

On every page load and refresh, the server retrieves the complete RSS feed without
filtering by status, then fetches each garage's details and map page from the
provider for total capacity and coordinates. There is no fixed garage count or ID list: newly added RSS entries appear on the
next page load or Refresh, including their dynamically fetched details. There are
no fixed capacity or coordinate files and no application data cache.

Metadata requests use bounded concurrency and a shared 12-second timeout. A failed
metadata request leaves the garage in the list with the missing fields marked as
unknown. If the RSS request fails, the app reports that the full list could not be
loaded; it does not silently substitute an incomplete or old list.

The browser favicon is `static/favicon.svg`, referenced in `src/app.html`.

The Zürich-inspired blue-and-white parking icon uses `static/favicon.svg` as its
source. Regenerate its ICO and PNG variants with `node scripts/generate-icons.mjs`
after installing Playwright Chromium, or use
`PLAYWRIGHT_CHANNEL=chrome node scripts/generate-icons.mjs` with installed Chrome.

## Search engines and sharing

The canonical production address is **https://zuri.city/**. `PUBLIC_SITE_URL`
can override it if the site moves. The app includes a descriptive page title,
meta description, canonical link, social-preview metadata, and WebSite / WebApplication
structured data. Garage data and explanatory content render on the server.

`/robots.txt` and `/sitemap.xml` advertise the production homepage. Local development
and hosts other than the canonical domain use `noindex` and disallow crawling.
After deploying to zuri.city, verify ownership in Google Search Console and Bing
Webmaster Tools and submit `https://zuri.city/sitemap.xml`. Indexing and ranking
are controlled by the search engines; this setup does not guarantee a position.

Unavailable garages are grouped at the bottom. Each garage card explains its own missing availability, counts, addresses or
coordinates, without a duplicate issues panel.
The title resets to the full available-garage list. Tap the footer greeting for a
little Zürich moment. Built by [dan.cv](https://dan.cv).
