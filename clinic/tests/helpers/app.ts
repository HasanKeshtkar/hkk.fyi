import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from 'fastify';
import type pg from 'pg';
import { buildApp, loggerOptions, type AppDeps } from '../../src/server/app.js';
import { hashPassword } from '../../src/server/auth/password.js';
import type { Config } from '../../src/server/config.js';
import type { Db } from '../../src/server/db/client.js';

export const TEST_ORIGIN = 'https://clinic.test';
export const PASSWORDS = { doctor: 'doctor-pass-123', secretary: 'secretary-pass-123' } as const;

export function testConfig(overrides: Partial<Config> = {}): Config {
  return {
    databaseUrl: 'unused',
    origins: [TEST_ORIGIN],
    port: 0,
    host: '127.0.0.1',
    trustProxyHops: 0,
    logLevel: 'silent',
    cookieName: '__Host-sid',
    cookieSecure: true,
    loginRateLimit: { max: 5, windowMs: 15 * 60 * 1000 },
    webRoot: null,
    backup: null,
    ...overrides,
  };
}

export interface TestApp {
  app: FastifyInstance;
  /** every log line the app wrote (JSON strings) */
  logs: string[];
}

export async function makeApp(
  db: Db,
  config: Partial<Config> = {},
  deps: Pick<AppDeps, 'socketSessionCheckMs'> = {},
): Promise<TestApp> {
  const logs: string[] = [];
  const app = await buildApp({
    ...deps,
    db,
    config: testConfig(config),
    logger: { ...loggerOptions('info'), stream: { write: (line: string) => void logs.push(line) } },
  });
  await app.ready();
  return { app, logs };
}

let hashes: Promise<{ doctor: string; secretary: string }> | undefined;

/** Gives the seeded test users real argon2 hashes for PASSWORDS (hashed once per test file). */
export async function setRealPasswords(pool: pg.Pool): Promise<void> {
  hashes ??= Promise.all([hashPassword(PASSWORDS.doctor), hashPassword(PASSWORDS.secretary)]).then(
    ([doctor, secretary]) => ({ doctor, secretary }),
  );
  const h = await hashes;
  await pool.query(`update users set password_hash = case role when 'doctor' then $1 else $2 end`, [h.doctor, h.secretary]);
}

export function sessionCookieFrom(res: LightMyRequestResponse): string {
  const c = res.cookies.find((x) => x.name === '__Host-sid');
  if (!c) throw new Error(`no session cookie in response ${res.statusCode}`);
  return `${c.name}=${c.value}`;
}

export async function login(app: FastifyInstance, role: 'doctor' | 'secretary'): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    headers: { origin: TEST_ORIGIN },
    payload: { role, password: PASSWORDS[role] },
  });
  if (res.statusCode !== 200) throw new Error(`login failed: ${res.statusCode} ${res.body}`);
  return sessionCookieFrom(res);
}

/** An API call as a browser on our origin would make it. */
export function call(
  app: FastifyInstance,
  cookie: string | null,
  method: InjectOptions['method'],
  url: string,
  payload?: unknown,
): Promise<LightMyRequestResponse> {
  return app.inject({
    method,
    url,
    headers: { origin: TEST_ORIGIN, ...(cookie ? { cookie } : {}) },
    ...(payload === undefined ? {} : { payload: payload as InjectOptions['payload'] }),
  });
}
