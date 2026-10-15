import type pg from 'pg';
import { createDb, createPool, type Db } from '../../src/server/db/client.js';
import { DEFAULT_WEEKLY_SCHEDULE } from '../../src/server/db/defaults.js';
import { users, weeklySchedule, type User } from '../../src/server/db/schema.js';
import { assertTestDatabase, TEST_DATABASE_URL } from './env.js';

export interface TestContext {
  pool: pg.Pool;
  db: Db;
  doctor: User;
  secretary: User;
}

export function openTestDb(max = 30): { pool: pg.Pool; db: Db } {
  assertTestDatabase(TEST_DATABASE_URL);
  const pool = createPool(TEST_DATABASE_URL, max);
  return { pool, db: createDb(pool) };
}

/** Empties every table and re-seeds the two users and the default weekly hours. */
export async function resetData(pool: pg.Pool, db: Db): Promise<{ doctor: User; secretary: User }> {
  await pool.query(
    'truncate notifications, audit_log, appointments, sessions, date_overrides, weekly_schedule, users restart identity cascade',
  );
  // A real argon2 hash is not needed here; auth tests hash their own.
  const [doctor] = await db.insert(users).values({ role: 'doctor', name: 'دکتر تست', passwordHash: 'x' }).returning();
  const [secretary] = await db
    .insert(users)
    .values({ role: 'secretary', name: 'منشی تست', passwordHash: 'x' })
    .returning();
  await db.insert(weeklySchedule).values([...DEFAULT_WEEKLY_SCHEDULE]);
  return { doctor: doctor!, secretary: secretary! };
}

/** A Tehran wall-clock time as an absolute instant (Iran has had no DST since 2022: fixed UTC+03:30). */
export function tehran(isoLocal: string): Date {
  return new Date(`${isoLocal}+03:30`);
}
