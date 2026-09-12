# Züri City

Explore a living Zürich in 3D. [Züri City](https://zuri.city/) is a mobile-friendly
SvelteKit app: a walkable MapLibre city map with SWISSIMAGE aerials, 3D buildings,
and **small cars** moving along real roads. Open stores, restaurants and attractions
are pinned on the map. Live parking from the
[Parkleitsystem Zürich](https://www.pls-zh.ch/) is a one-tap overlay — not the main
product.

## What it does

- Puts you above Zürich in an orbital “god’s-eye” view, then lets you walk street-level with WASD / arrow keys.
- Animates simulated traffic on OpenStreetMap road centerlines — denser and slower in congestion, lighter when free.
- Pins open attractions, restaurants and shops on a 3D building map (SWISSIMAGE + OpenFreeMap).
- Lets you toggle **Parking** for live garage free spaces, search, and directions.
- Supports light and dark mode, and can be added to your home screen as a web app.

## How it started

What started as a parking-focused phone browser for the PLS feed grew into a
city-first experience. The homepage is the living map of Zürich; parking remains
a first-class feature overlay.

## Developing

Use Node.js **24.x**, npm, and OpenSSL, then run:

```bash
npm ci
npm run dev
```

The development server uses HTTPS and is exposed on your local network, so you can
try it on your phone. Follow the certificate setup in [AGENTS.md](AGENTS.md) to
trust the local connection and enable location access.

## Building

Create and preview a production build:

```bash
npm run build
npm run preview
```

For detailed setup, checks, deployment notes, and implementation guidance for
coding agents, see [AGENTS.md](AGENTS.md).
