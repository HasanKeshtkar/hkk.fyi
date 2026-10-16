// A new server sets itself up: default hours and the two accounts from the environment, once.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { verifyPassword } from '../../src/server/auth/password.js';
import { ensureInitialData } from '../../src/server/initial-data.js';
import { openTestDb } from '../helpers/db.js';

const { pool, db } = openTestDb(5);
const logs: string[] = [];
const log = { info: (_o: object, m: string) => logs.push(m), warn: (_o: object, m: string) => logs.push(`WARN ${m}`) };

beforeEach(async () => {
  logs.length = 0;
  await pool.query('truncate notifications, audit_log, appointments, sessions, date_overrides, weekly_schedule, users restart identity cascade');
});
afterAll(async () => {
  await pool.end();
});

const env = {
  SEED_DOCTOR_NAME: 'دکتر کشتکار',
  SEED_DOCTOR_PASSWORD: 'doctor-pass-1',
  SEED_SECRETARY_PASSWORD: 'secretary-pass-1',
};

describe('first start', () => {
  it('creates the default hours and both accounts', async () => {
    await ensureInitialData(db, env, log);
    const u = (await pool.query('select role, name, password_hash from users order by role')).rows;
    expect(u.map((x) => [x.role, x.name])).toEqual([
      ['doctor', 'دکتر کشتکار'],
      ['secretary', 'منشی'],
    ]);
    expect(await verifyPassword(u[0].password_hash, 'doctor-pass-1')).toBe(true);
    expect((await pool.query('select count(*)::int as n from weekly_schedule')).rows[0].n).toBe(7);
  });

  it('never changes what already exists', async () => {
    await ensureInitialData(db, env, log);
    await pool.query("update weekly_schedule set is_open = false, version = version + 1 where weekday = 6");
    const before = (await pool.query('select * from users order by role')).rows;
    await ensureInitialData(db, { ...env, SEED_DOCTOR_PASSWORD: 'another-pass-2', SEED_DOCTOR_NAME: 'x' }, log);
    expect((await pool.query('select * from users order by role')).rows).toEqual(before);
    expect((await pool.query('select is_open from weekly_schedule where weekday = 6')).rows[0].is_open).toBe(false);
  });

  it('without a password (or a too short one) it creates nothing for that role and says so', async () => {
    await ensureInitialData(db, { SEED_DOCTOR_PASSWORD: 'doctor-pass-1', SEED_SECRETARY_PASSWORD: 'short' }, log);
    expect((await pool.query('select role from users')).rows).toEqual([{ role: 'doctor' }]);
    expect(logs.some((m) => m.startsWith('WARN no secretary account yet'))).toBe(true);
  });
});
