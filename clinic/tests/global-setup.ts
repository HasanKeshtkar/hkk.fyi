import { createPool } from '../src/server/db/client.js';
import { runMigrations } from '../src/server/db/migrate.js';
import { assertTestDatabase, TEST_DATABASE_URL } from './helpers/env.js';

export default async function setup(): Promise<void> {
  assertTestDatabase(TEST_DATABASE_URL);
  const pool = createPool(TEST_DATABASE_URL, 1);
  try {
    await pool.query('drop schema if exists public cascade');
    await pool.query('drop schema if exists drizzle cascade');
    await pool.query('create schema public');
    await runMigrations(pool);
  } finally {
    await pool.end();
  }
}
