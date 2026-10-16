import type { Clinic } from './clinic';

/** Bindings and settings (wrangler.jsonc `vars`, secrets, or `--var` locally). */
export interface Env {
  CLINIC: DurableObjectNamespace<Clinic>;
  ASSETS: Fetcher;
  /** The app's public address(es), comma-separated, the first canonical. The only place a domain is set. */
  APP_ORIGIN: string;
  SEED_DOCTOR_NAME?: string;
  SEED_DOCTOR_PASSWORD?: string;
  SEED_SECRETARY_NAME?: string;
  SEED_SECRETARY_PASSWORD?: string;
  /** Logins allowed per IP per 15 minutes (default 5). */
  LOGIN_RATE_LIMIT_MAX?: string;
  /** Daily backups kept (default 30). */
  BACKUP_KEEP?: string;
  /** Set by CI on every deploy (the commit): passwords from SEED_* are compared once per deploy. */
  DEPLOY_ID?: string;
  /** '1' only in tests: enables /api/test/* (resetting data). Never set in production. */
  TEST_MODE?: string;
}

export interface Origins {
  list: string[];
  canonical: string;
  cookieName: string;
  cookieSecure: boolean;
  https: boolean;
}

function parseOrigin(raw: string): string {
  const url = new URL(raw.trim());
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error(`APP_ORIGIN: unsupported scheme in ${raw}`);
  if (url.origin !== raw.trim().replace(/\/$/, '')) throw new Error(`APP_ORIGIN must be a bare origin, got ${raw}`);
  return url.origin;
}

export function originsOf(env: Env): Origins {
  const list = (env.APP_ORIGIN ?? '').split(',').filter((s) => s.trim() !== '').map(parseOrigin);
  if (list.length === 0) throw new Error('APP_ORIGIN is not set');
  const canonical = new URL(list[0]!);
  const isLocalhost = canonical.hostname === 'localhost' || canonical.hostname === '127.0.0.1';
  const https = canonical.protocol === 'https:';
  // Browsers accept Secure cookies on http://localhost; only a plain-http LAN address goes without.
  const cookieSecure = https || isLocalhost;
  return { list, canonical: list[0]!, cookieName: cookieSecure ? '__Host-sid' : 'sid', cookieSecure, https };
}
