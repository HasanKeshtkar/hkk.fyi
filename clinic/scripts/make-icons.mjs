// Renders the app icons (public/icons/*.png, src/app/icon.png) from the SVG below with Chromium.
// Run after changing the design: `node scripts/make-icons.mjs`. The PNGs are committed.
import { writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const GREEN = '#1b6b5a';
const TOOTH =
  'M30 22C22 22 16 30 17 40C18 50 22 56 25 64C28 73 29 86 35 86C41 86 40 70 45 66C47 64 53 64 55 66C60 70 59 86 65 86C71 86 72 73 75 64C78 56 82 50 83 40C84 30 78 22 70 22C62 22 58 27 50 27C42 27 38 22 30 22Z';

/** `inset`: the tooth's share of the icon; maskable icons keep it inside the central safe zone. */
const svg = ({ rounded, inset }) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="${rounded ? 22 : 0}" fill="${GREEN}"/>
  <g transform="translate(${50 - inset / 2} ${50 - inset / 2 + 1}) scale(${inset / 100})">
    <path d="${TOOTH}" fill="#fff"/>
  </g>
</svg>`;

const icons = [
  { file: 'public/icons/icon-192.png', size: 192, rounded: true, inset: 70 },
  { file: 'public/icons/icon-512.png', size: 512, rounded: true, inset: 70 },
  { file: 'public/icons/maskable-512.png', size: 512, rounded: false, inset: 52 },
  { file: 'src/app/icon.png', size: 64, rounded: true, inset: 74 },
];

const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
const page = await browser.newPage();
for (const icon of icons) {
  await page.setViewportSize({ width: icon.size, height: icon.size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svg(icon).replace('<svg ', `<svg width="${icon.size}" height="${icon.size}" `)}</body></html>`,
  );
  await writeFile(icon.file, await page.screenshot({ omitBackground: true }));
  console.log(`wrote ${icon.file}`);
}
await browser.close();
