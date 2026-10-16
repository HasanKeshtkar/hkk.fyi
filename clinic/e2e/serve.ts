// Starts the real server (built web app + API) on a fresh database for the browser tests.
import { hashPassword } from '../src/server/auth/password.js';
import { createDb, createPool } from '../src/server/db/client.js';
import { DEFAULT_WEEKLY_SCHEDULE } from '../src/server/db/defaults.js';
import { runMigrations } from '../src/server/db/migrate.js';
import { users, weeklySchedule } from '../src/server/db/schema.js';
import { E2E_DATABASE_URL, E2E_NAMES, E2E_ORIGIN, E2E_PASSWORDS, E2E_PORT } from './env.js';

const dbName = new URL(E2E_DATABASE_URL).pathname.slice(1);
if (!dbName.endsWith('_test')) throw new Error(`refusing to wipe ${dbName}: name must end in _test`);

const admin = createPool(E2E_DATABASE_URL.replace(/\/[^/]+$/, '/postgres'), 1);
await admin.query(`drop database if exists ${dbName} with (force)`);
await admin.query(`create database ${dbName}`);
await admin.end();

const pool = createPool(E2E_DATABASE_URL, 2);
await runMigrations(pool);
const db = createDb(pool);
await db.insert(users).values([
  { role: 'doctor', name: E2E_NAMES.doctor, passwordHash: await hashPassword(E2E_PASSWORDS.doctor) },
  { role: 'secretary', name: E2E_NAMES.secretary, passwordHash: await hashPassword(E2E_PASSWORDS.secretary) },
]);
await db.insert(weeklySchedule).values([...DEFAULT_WEEKLY_SCHEDULE]);
await pool.end();

Object.assign(process.env, {
  DATABASE_URL: E2E_DATABASE_URL,
  APP_ORIGIN: E2E_ORIGIN,
  PORT: String(E2E_PORT),
  HOST: '127.0.0.1',
  WEB_ROOT: 'out',
  LOG_LEVEL: 'warn',
  LOGIN_RATE_LIMIT_MAX: '100',
});
await import('../src/server/index.js');
