// The service worker's rules, run against fake browser caches and network: pages always come
// from the network when there is one, the saved copy is used only offline, and patient data
// (/api/) and the live channel are never touched or saved.
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGIN = 'https://clinic.test';
const PRECACHE = ['/', '/login/', '/settings/', '/_next/static/chunks/app.js'];

type Req = { url: string; method: string; mode: string };
const key = (r: string | Req) => new URL(typeof r === 'string' ? r : r.url, ORIGIN).href;

let stores: Map<string, Map<string, Response>>;
let handlers: Map<string, (e: unknown) => void>;
let network: Map<string, { status: number; body: string }> | null; // null = offline
let fetched: string[];
let self: { location: { origin: string }; addEventListener: (t: string, f: (e: unknown) => void) => void; skipWaiting: () => Promise<void>; clients: { claim: () => Promise<void> } };

function cacheApi(name: string) {
  if (!stores.has(name)) stores.set(name, new Map());
  const store = stores.get(name)!;
  return {
    async match(r: string | Req) {
      return store.get(key(r))?.clone();
    },
    async put(r: string | Req, res: Response) {
      store.set(key(r), res);
    },
    async addAll(urls: string[]) {
      for (const u of urls) store.set(key(u), (await fakeFetch({ url: key(u), method: 'GET', mode: 'cors' })).clone());
    },
  };
}

const caches = {
  open: async (name: string) => cacheApi(name),
  keys: async () => [...stores.keys()],
  delete: async (name: string) => stores.delete(name),
};

async function fakeFetch(r: Req): Promise<Response> {
  fetched.push(new URL(r.url).pathname + new URL(r.url).search);
  if (!network) throw new TypeError('Failed to fetch');
  const hit = network.get(new URL(r.url).pathname) ?? { status: 404, body: 'not found' };
  const res = new Response(hit.body, { status: hit.status });
  Object.defineProperty(res, 'type', { value: 'basic' }); // same-origin, as the browser reports it
  return res;
}

function loadServiceWorker() {
  const code = readFileSync('public/sw.js', 'utf8')
    .replace("const BUILD = '__BUILD__';", "const BUILD = 'b2';")
    .replace('const PRECACHE = __PRECACHE__;', `const PRECACHE = ${JSON.stringify(PRECACHE)};`);
  new Function('self', 'caches', 'fetch', code)(self, caches, fakeFetch);
}

/** Dispatches a fetch event; returns the response the worker gave, or null if it let it pass. */
async function request(path: string, init: Partial<Req> = {}): Promise<Response | null> {
  let given: Promise<Response> | null = null;
  handlers.get('fetch')!({
    request: { url: new URL(path, ORIGIN).href, method: 'GET', mode: 'cors', ...init },
    respondWith: (p: Promise<Response>) => (given = p),
  });
  return given;
}

async function lifecycle(type: 'install' | 'activate') {
  let done: Promise<unknown> = Promise.resolve();
  handlers.get(type)!({ waitUntil: (p: Promise<unknown>) => (done = p) });
  await done;
}

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  stores = new Map();
  handlers = new Map();
  fetched = [];
  network = new Map([
    ['/', { status: 200, body: 'page v2' }],
    ['/login/', { status: 200, body: 'login v2' }],
    ['/settings/', { status: 200, body: 'settings v2' }],
    ['/_next/static/chunks/app.js', { status: 200, body: 'app v2' }],
    ['/manifest.webmanifest', { status: 200, body: '{}' }],
    ['/api/day', { status: 200, body: '{"patient":"secret"}' }],
  ]);
  self = {
    location: { origin: ORIGIN },
    addEventListener: (t, f) => handlers.set(t, f),
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}) },
  };
  loadServiceWorker();
});

describe('service worker', () => {
  it('saves the app shell on install, then replaces older versions’ saved files', async () => {
    stores.set('clinic-b1', new Map([[key('/'), new Response('page v1')]]));
    stores.set('someone-else', new Map());
    await lifecycle('install');
    expect([...stores.get('clinic-b2')!.keys()].sort()).toEqual(PRECACHE.map((p) => key(p)).sort());
    expect(self.skipWaiting).toHaveBeenCalled();
    await lifecycle('activate');
    expect([...stores.keys()].sort()).toEqual(['clinic-b2', 'someone-else']);
    expect(self.clients.claim).toHaveBeenCalled();
  });

  it('pages come from the network whenever there is one (a new version shows at once)', async () => {
    await lifecycle('install');
    network!.set('/', { status: 200, body: 'page v3 (just deployed)' });
    const res = await request('/?d=2026-10-17', { mode: 'navigate' });
    expect(await res!.text()).toBe('page v3 (just deployed)');
  });

  it('offline, a page opens from its saved copy (any address: the app routes itself)', async () => {
    await lifecycle('install');
    network = null;
    expect(await (await request('/settings/', { mode: 'navigate' }))!.text()).toBe('settings v2');
    expect(await (await request('/?d=2026-10-17', { mode: 'navigate' }))!.text()).toBe('page v2');
    expect(await (await request('/unknown/', { mode: 'navigate' }))!.text()).toBe('page v2');
  });

  it('keeps the newest copy of a page it fetched', async () => {
    await lifecycle('install');
    network!.set('/login/', { status: 200, body: 'login v3' });
    await request('/login/', { mode: 'navigate' });
    await flush();
    network = null;
    expect(await (await request('/login/', { mode: 'navigate' }))!.text()).toBe('login v3');
  });

  it('never touches data, the live channel, writes or other sites', async () => {
    await lifecycle('install');
    fetched = [];
    expect(await request('/api/day?date=2026-10-17')).toBeNull();
    expect(await request('/api/backups/clinic-2026-10-16_0300.dump', { mode: 'navigate' })).toBeNull();
    expect(await request('/socket.io/?EIO=4&transport=websocket')).toBeNull();
    expect(await request('/api/appointments', { method: 'POST' })).toBeNull();
    expect(await request('https://cdn.example.com/x.js')).toBeNull();
    expect(fetched).toEqual([]);
    const saved = [...stores.values()].flatMap((s) => [...s.keys()]);
    expect(saved.some((k) => k.includes('/api/'))).toBe(false);
  });

  it('build files: the saved copy first (their names change with their content)', async () => {
    await lifecycle('install');
    fetched = [];
    expect(await (await request('/_next/static/chunks/app.js'))!.text()).toBe('app v2');
    expect(fetched).toEqual([]);
  });

  it('other files: network first, saved copy offline; error pages are never saved', async () => {
    await lifecycle('install');
    expect((await request('/manifest.webmanifest'))!.status).toBe(200);
    expect((await request('/missing.png'))!.status).toBe(404);
    await flush();
    network = null;
    expect(await (await request('/manifest.webmanifest'))!.text()).toBe('{}');
    expect(stores.get('clinic-b2')!.has(key('/missing.png'))).toBe(false);
    await expect(request('/missing.png')).rejects.toThrow('Failed to fetch');
  });
});
