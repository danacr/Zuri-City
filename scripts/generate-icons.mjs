import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

// Render every format from the SVG source. Set PLAYWRIGHT_CHANNEL=chrome to use installed Chrome.
const source = await readFile(new URL('../static/favicon.svg', import.meta.url), 'utf8');
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
try {
	const page = await browser.newPage({ deviceScaleFactor: 1 });
	const pngs = new Map();
	for (const size of [16, 32, 48, 180, 192, 256, 512]) {
		await page.setViewportSize({ width: size, height: size });
		await page.setContent(
			`<style>html,body{margin:0;width:100%;height:100%;background:transparent}svg{display:block;width:100%;height:100%}</style>${source}`
		);
		pngs.set(size, await page.screenshot({ omitBackground: true }));
	}
	const files = {
		'favicon.png': 32,
		'favicon-16x16.png': 16,
		'favicon-32x32.png': 32,
		'apple-touch-icon.png': 180,
		'android-chrome-192x192.png': 192,
		'android-chrome-512x512.png': 512
	};
	for (const [name, size] of Object.entries(files)) {
		await writeFile(new URL(`../static/${name}`, import.meta.url), pngs.get(size));
	}
	// ICO directory with PNG-compressed images for small tabs and high-DPI displays.
	const sizes = [16, 32, 48, 256];
	const header = Buffer.alloc(6 + 16 * sizes.length);
	header.writeUInt16LE(1, 2);
	header.writeUInt16LE(sizes.length, 4);
	let offset = header.length;
	sizes.forEach((size, index) => {
		const entry = 6 + index * 16;
		header[entry] = header[entry + 1] = size === 256 ? 0 : size;
		header.writeUInt16LE(1, entry + 4);
		header.writeUInt16LE(32, entry + 6);
		header.writeUInt32LE(pngs.get(size).length, entry + 8);
		header.writeUInt32LE(offset, entry + 12);
		offset += pngs.get(size).length;
	});
	await writeFile(
		new URL('../static/favicon.ico', import.meta.url),
		Buffer.concat([header, ...sizes.map((size) => pngs.get(size))])
	);
	console.log('Generated favicon.ico and six PNG icons from favicon.svg.');
} finally {
	await browser.close();
}
