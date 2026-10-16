// After `next build`: fills in out/sw.js with this build's id and the files the app needs to open
// offline (its pages and every content-hashed build file). A new build changes the id, so phones
// pick up the new service worker and drop the old saved files.
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT = 'out';
const PAGES = ['/', '/login/', '/settings/'];

async function filesUnder(dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries.filter((e) => e.isFile()).map((e) => path.join(e.parentPath, e.name));
}

const staticFiles = (await filesUnder(path.join(OUT, '_next', 'static'))).sort();
const precache = [...PAGES, ...staticFiles.map((f) => `/${path.relative(OUT, f).split(path.sep).join('/')}`)];

const hash = createHash('sha256');
for (const p of PAGES) hash.update(await readFile(path.join(OUT, p, 'index.html')));
for (const f of staticFiles) hash.update(f);
const build = hash.digest('hex').slice(0, 16);

const swPath = path.join(OUT, 'sw.js');
const sw = await readFile(swPath, 'utf8');
const BUILD_LINE = "const BUILD = '__BUILD__';";
const PRECACHE_LINE = 'const PRECACHE = __PRECACHE__;';
if (!sw.includes(BUILD_LINE) || !sw.includes(PRECACHE_LINE)) throw new Error(`${swPath}: placeholders not found (already finalized?)`);
await writeFile(
  swPath,
  sw
    .replace(BUILD_LINE, `const BUILD = ${JSON.stringify(build)};`)
    .replace(PRECACHE_LINE, `const PRECACHE = ${JSON.stringify(precache)};`),
);
console.log(`sw.js: build ${build}, ${precache.length} files to save for offline`);
