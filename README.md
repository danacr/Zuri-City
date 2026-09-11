# Züri City Parking

A mobile-friendly view of Zürich parking availability, built with SvelteKit,
TypeScript, Skeleton, and Leaflet. Parking data comes from the
[Parkleitsystem Zürich RSS feed](https://www.pls-zh.ch/plsFeed/rss) and is fetched
on the server whenever the page loads.

## Getting started

Install Node.js, npm, and OpenSSL (with support for `req -addext`), then install the project dependencies:

```bash
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

- **List view** shows open garages, ordered by the number of free spaces. Select
  a garage to start Google Maps navigation or its status to open provider details.
- **Near me · Location mode** requests browser location permission and displays
  up to ten nearest garages on a map, ordered by straight-line distance.
- Map markers show free-space counts in green, **Full** in red, and closed or
  unknown availability in grey. Select a marker for details and navigation.

Location access requires a trusted secure connection and browser permission.
For local mobile testing, follow the certificate trust steps above.

Your location is used in the browser. Map tiles are loaded from OpenStreetMap.
Reload the page to refresh parking availability.

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

## Parking coordinates

`src/lib/parking-coordinates.json` contains coordinates for 36 garages, retrieved
on 2026-09-11 from the provider's
`https://www.pls-zh.ch/parkhaus/parkhausmap.jsp?pid=…` pages. Entries are keyed by
the parking ID in the RSS feed.

Add coordinates when the provider adds a garage. Garages without coordinates
remain eligible for the open-parking list but are omitted from the map.

The browser favicon is `static/favicon.svg`, referenced in `src/app.html`.
