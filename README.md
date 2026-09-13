# Züri City

[Züri City](https://zuri.city/) is a live 3D map of Zürich — traffic on real streets, solid buildings, open places, aircraft overhead, and parking capacity always on the map.

## What it does

- Opens Zürich from orbit, then lets you walk street-level with WASD / arrow keys.
- Colors major corridors green / amber / red from live Swiss ASTRA DATEX counters (not a fake road hash).
- Pins open attractions, restaurants, and shops on SWISSIMAGE + OpenFreeMap.
- Keeps PLS parking pills visible on the map (not a hideable overlay).
- Installs as a home-screen web app with dark city chrome.

## How it started

A parking-focused phone browser for the PLS feed grew into a city-first map. The homepage is Zürich itself; parking stays a first-class, always-on layer.

## Developing

Use Node.js **24.x**, npm, and OpenSSL, then run:

```bash
npm ci
npm run dev
```

The development server uses HTTPS on your local network so you can try it on your phone. Follow the certificate setup in [AGENTS.md](AGENTS.md) to trust the connection and enable location.

## Building

```bash
npm run build
npm run preview
```
