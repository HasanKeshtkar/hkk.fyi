import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

export interface Config {
  databaseUrl: string;
  /** Allowed browser origins; the first is canonical. Comes only from APP_ORIGIN, never hard-coded. */
  origins: string[];
  port: number;
  host: string;
  /** Number of reverse proxies in front of the app (Liara: 1). 0 = trust no X-Forwarded-* header. */
  trustProxyHops: number;
  logLevel: string;
  cookieName: string;
  cookieSecure: boolean;
  loginRateLimit: { max: number; windowMs: number };
  /** The built web app (next build → out/); null serves the API only. */
  webRoot: string | null;
}

function parseOrigin(raw: string): string {
  const url = new URL(raw.trim());
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error(`APP_ORIGIN: unsupported scheme in ${raw}`);
  if (url.origin !== raw.trim().replace(/\/$/, '')) throw new Error(`APP_ORIGIN must be a bare origin like https://example.com, got ${raw}`);
  return url.origin;
}

function resolveWebRoot(configured: string | undefined): string | null {
  const dir = path.resolve(configured ?? 'out');
  if (existsSync(path.join(dir, 'index.html'))) return dir;
  if (configured) throw new Error(`WEB_ROOT ${dir} has no index.html (run npm run build:web)`);
  return null;
}

const Env = z.object({
  DATABASE_URL: z.string().min(1),
  APP_ORIGIN: z.string().min(1),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('0.0.0.0'),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1000).default(5),
  WEB_ROOT: z.string().optional(),
});

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const e = Env.parse(env);
  const origins = e.APP_ORIGIN.split(',').filter((s) => s.trim() !== '').map(parseOrigin);
  if (origins.length === 0) throw new Error('APP_ORIGIN is empty');
  const canonical = new URL(origins[0]!);
  const isLocalhost = canonical.hostname === 'localhost' || canonical.hostname === '127.0.0.1';
  // Browsers accept Secure cookies on http://localhost, so only a plain-http LAN address goes without.
  const cookieSecure = canonical.protocol === 'https:' || isLocalhost;
  return {
    databaseUrl: e.DATABASE_URL,
    origins,
    port: e.PORT,
    host: e.HOST,
    trustProxyHops: e.TRUST_PROXY_HOPS,
    logLevel: e.LOG_LEVEL,
    // __Host- pins the cookie to this exact host over HTTPS with no Domain attribute.
    cookieName: cookieSecure ? '__Host-sid' : 'sid',
    cookieSecure,
    loginRateLimit: { max: e.LOGIN_RATE_LIMIT_MAX, windowMs: 15 * 60 * 1000 },
    webRoot: resolveWebRoot(e.WEB_ROOT),
  };
}
