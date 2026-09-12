# Züri City

Explore a virtual Zürich in 3D. [Züri City](https://zuri.city/) is a mobile-friendly
SvelteKit app with a walkable MapLibre city map of open stores, restaurants and
attractions. Live parking from the
[Parkleitsystem Zürich](https://www.pls-zh.ch/) is available as a one-tap feature
overlay — not the main product.

## What it does

- Puts you above Zürich in an orbital “god’s-eye” view, then lets you walk street-level with WASD / arrow keys.
- Pins open attractions, restaurants and shops on a 3D building map (OpenFreeMap + OpenStreetMap).
- Lets you toggle **Parking** to see live garage free spaces, search, and directions.
- Supports light and dark mode, and can be added to your home screen as a web app.

## How it started

What started as a parking-focused phone browser for the PLS feed grew into a
city-first experience. Parking remains a first-class feature, but the homepage is
now the map of Zürich itself.

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
