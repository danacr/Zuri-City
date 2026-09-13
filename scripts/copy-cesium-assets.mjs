#!/usr/bin/env node
/**
 * Copy Cesium runtime Workers/Assets into `static/cesiumStatic` so SvelteKit
 * (and Vercel) serve them at `/cesiumStatic/...` without relying on Vite outDir quirks.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'node_modules/cesium/Build/Cesium');
const dest = join(root, 'static/cesiumStatic');
const folders = ['Workers', 'ThirdParty', 'Assets', 'Widgets'];

if (!existsSync(join(source, 'Cesium.js')) && !existsSync(join(source, 'index.js'))) {
	console.warn('[copy-cesium] cesium Build/Cesium not found — skip');
	process.exit(0);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });

for (const folder of folders) {
	const from = join(source, folder);
	if (!existsSync(from)) {
		console.warn(`[copy-cesium] missing ${folder} — skip`);
		continue;
	}
	cpSync(from, join(dest, folder), { recursive: true });
}

console.log('[copy-cesium] synced Workers/Assets/Widgets/ThirdParty → static/cesiumStatic');
