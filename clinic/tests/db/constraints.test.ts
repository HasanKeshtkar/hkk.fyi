// Database-level guarantees, exercised with raw SQL so no application code can mask a gap.
import type pg from 'pg';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { pgErrorOf } from '../../src/server/db/errors.js';
import type { User } from '../../src/server/db/schema.js';
import { openTestDb, resetData } from '../helpers/db.js';

const { pool, db } = openTestDb(5);
let doctor: User;

beforeEach(async () => {
  ({ doctor } = await resetData(pool, db));
});

afterAll(async () => {
  await pool.end();
});

function insertAppointment(
  startAt: string,
  opts: { name?: string; phone?: string; status?: 'scheduled' | 'cancelled'; version?: number } = {},
  client: pg.Pool | pg.PoolClient = pool,
) {
  return client.query(
    `insert into appointments (start_at, patient_name, patient_phone, status, created_by, updated_by, version)
     values ($1, $2, $3, $4, $5, $5, $6) returning id`,
    [
      startAt,
      opts.name ?? 'بیمار',
      opts.phone ?? '09121234567',
      opts.status ?? 'scheduled',
      doctor.id,
      opts.version ?? 1,
    ],
  );
}

async function expectViolation(promise: Promise<unknown>, code: string, constraint: string) {
  const err = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err, `expected ${constraint} to be violated`).not.toBeNull();
  expect(pgErrorOf(err)).toEqual({ code, constraint });
}

const CHECK = '23514';
const UNIQUE = '23505';

describe('appointments: start_at on :00 / :30', () => {
  it('accepts Tehran :00 and :30', async () => {
    await insertAppointment('2026-10-17 14:00:00+03:30');
    await insertAppointment('2026-10-17 14:30:00+03:30');
    await insertAppointment('2026-10-17 08:00:00+03:30');
  });

  it.each([
    '2026-10-17 14:15:00+03:30',
    '2026-10-17 14:45:00+03:30',
    '2026-10-17 14:00:30+03:30',
    '2026-10-17 14:00:00.5+03:30',
    '2026-10-17 14:00:00.000001+03:30',
    '2026-10-17 14:29:59+03:30',
  ])('rejects %s', async (startAt) => {
    await expectViolation(insertAppointment(startAt), CHECK, 'appointments_start_on_half_hour');
  });

  it('gives the same verdict whatever the session time zone is', async () => {
    const client = await pool.connect();
    try {
      for (const tz of ['UTC', 'Asia/Tehran', 'America/St_Johns', 'Asia/Kathmandu']) {
        await client.query(`set time zone '${tz}'`);
        await expectViolation(
          insertAppointment('2026-10-17 14:15:00+03:30', {}, client),
          CHECK,
          'appointments_start_on_half_hour',
        );
      }
      await client.query(`set time zone 'Asia/Kathmandu'`); // UTC+05:45
      await insertAppointment('2026-10-17 15:00:00+03:30', {}, client);
    } finally {
      await client.query('reset time zone');
      client.release();
    }
  });
});

describe('appointments: one live appointment per slot', () => {
  const slot = '2026-10-17 15:00:00+03:30';

  it('rejects a second scheduled appointment in the same slot', async () => {
    await insertAppointment(slot);
    await expectViolation(insertAppointment(slot, { name: 'دیگری' }), UNIQUE, 'appointments_active_slot_uq');
  });

  it('treats the same instant written in another offset as the same slot', async () => {
    await insertAppointment(slot);
    await expectViolation(insertAppointment('2026-10-17 11:30:00+00'), UNIQUE, 'appointments_active_slot_uq');
  });

  it('lets cancelled appointments share the slot with each other and with a live one', async () => {
    await insertAppointment(slot, { status: 'cancelled' });
    await insertAppointment(slot, { status: 'cancelled' });
    await insertAppointment(slot);
    const { rows } = await pool.query(`select status, count(*)::int as n from appointments group by status order by status`);
    expect(rows).toEqual([
      { status: 'scheduled', n: 1 },
      { status: 'cancelled', n: 2 },
    ]);
  });

  it('rejects un-cancelling into a slot that has been re-booked', async () => {
    const { rows } = await insertAppointment(slot, { status: 'cancelled' });
    await insertAppointment(slot);
    await expectViolation(
      pool.query(`update appointments set status = 'scheduled' where id = $1`, [rows[0].id]),
      UNIQUE,
      'appointments_active_slot_uq',
    );
  });

  it('rejects moving an appointment into an occupied slot', async () => {
    await insertAppointment(slot);
    const { rows } = await insertAppointment('2026-10-17 15:30:00+03:30');
    await expectViolation(
      pool.query(`update appointments set start_at = $2 where id = $1`, [rows[0].id, slot]),
      UNIQUE,
      'appointments_active_slot_uq',
    );
  });
});

describe('appointments: field checks', () => {
  const slot = '2026-10-18 14:00:00+03:30';

  it.each(['9121234567', '۰۹۱۲۱۲۳۴۵۶۷', '0912123456', '091212345678', '0912 123 4567', '02112345678', ''])(
    'rejects un-normalized or invalid phone %j',
    async (phone) => {
      await expectViolation(insertAppointment(slot, { phone }), CHECK, 'appointments_phone_format');
    },
  );

  it.each(['', ' علی', 'علی ', 'ا'.repeat(101), 'علی\u0007', 'علی\nرضایی'])('rejects invalid name %j', async (name) => {
    await expectViolation(insertAppointment(slot, { name }), CHECK, 'appointments_name_valid');
  });

  it('accepts a 100-character name', async () => {
    await insertAppointment(slot, { name: 'ا'.repeat(100) });
  });

  it('rejects version < 1', async () => {
    await expectViolation(insertAppointment(slot, { version: 0 }), CHECK, 'appointments_version_positive');
  });

  it('rejects an unknown status', async () => {
    const err = await pool
      .query(
        `insert into appointments (start_at, patient_name, patient_phone, status, created_by, updated_by)
         values ($1, 'x', '09121234567', 'done', $2, $2)`,
        [slot, doctor.id],
      )
      .catch((e: unknown) => e);
    expect(pgErrorOf(err)?.code).toBe('22P02'); // invalid input value for enum
  });
});

describe('users', () => {
  it('allows only one user per role', async () => {
    await expectViolation(
      pool.query(`insert into users (name, role, password_hash) values ('دکتر دوم', 'doctor', 'x')`),
      UNIQUE,
      'users_role_uq',
    );
  });
});

describe('weekly_schedule', () => {
  const upsert = (weekday: number, start: string, end: string) =>
    pool.query(
      `insert into weekly_schedule (weekday, is_open, start_time, end_time) values ($1, true, $2, $3)
       on conflict (weekday) do update set start_time = excluded.start_time, end_time = excluded.end_time`,
      [weekday, start, end],
    );

  it('accepts half-hour times, including an end of 24:00', async () => {
    await upsert(6, '14:00', '18:00');
    await upsert(6, '08:30', '24:00');
  });

  it('rejects times off the half hour', async () => {
    await expectViolation(upsert(6, '14:15', '19:00'), CHECK, 'weekly_schedule_half_hour');
    await expectViolation(upsert(6, '14:00', '18:59'), CHECK, 'weekly_schedule_half_hour');
  });

  it('rejects end not after start', async () => {
    await expectViolation(upsert(6, '14:00', '14:00'), CHECK, 'weekly_schedule_time_order');
    await expectViolation(upsert(6, '19:00', '14:00'), CHECK, 'weekly_schedule_time_order');
  });

  it('rejects a weekday outside 0..6', async () => {
    await expectViolation(upsert(7, '14:00', '19:00'), CHECK, 'weekly_schedule_weekday_range');
    await expectViolation(upsert(-1, '14:00', '19:00'), CHECK, 'weekly_schedule_weekday_range');
  });
});

describe('date_overrides', () => {
  const insert = (isOpen: boolean, start: string | null, end: string | null, note: string | null = null) =>
    pool.query(
      `insert into date_overrides (date, is_open, start_time, end_time, note) values ('2026-10-20', $1, $2, $3, $4)`,
      [isOpen, start, end, note],
    );

  it('accepts a closed day without hours', async () => {
    await insert(false, null, null, 'تعطیل رسمی');
  });

  it('accepts an open day with half-hour hours', async () => {
    await insert(true, '09:00', '13:30');
  });

  it('rejects an open day without hours or with inverted hours', async () => {
    await expectViolation(insert(true, null, null), CHECK, 'date_overrides_hours_match_open');
    await expectViolation(insert(true, '09:00', null), CHECK, 'date_overrides_hours_match_open');
    await expectViolation(insert(true, '13:00', '09:00'), CHECK, 'date_overrides_hours_match_open');
  });

  it('rejects a closed day that carries hours', async () => {
    await expectViolation(insert(false, '09:00', '13:00'), CHECK, 'date_overrides_hours_match_open');
  });

  it('rejects hours off the half hour', async () => {
    await expectViolation(insert(true, '09:10', '13:00'), CHECK, 'date_overrides_half_hour');
  });

  it('rejects a note over 200 characters', async () => {
    await expectViolation(insert(false, null, null, 'ا'.repeat(201)), CHECK, 'date_overrides_note_length');
  });
});

describe('audit_log and notifications', () => {
  it('rejects unknown audit entity/action', async () => {
    await expectViolation(
      pool.query(`insert into audit_log (entity, entity_id, action) values ('patient', '1', 'create')`),
      CHECK,
      'audit_log_entity_valid',
    );
    await expectViolation(
      pool.query(`insert into audit_log (entity, entity_id, action) values ('appointment', '1', 'purge')`),
      CHECK,
      'audit_log_action_valid',
    );
  });

  it('rejects unknown notification type', async () => {
    const { rows } = await insertAppointment('2026-10-17 16:00:00+03:30');
    await expectViolation(
      pool.query(
        `insert into notifications (recipient_id, appointment_id, type, payload) values ($1, $2, 'moved', '{}')`,
        [doctor.id, rows[0].id],
      ),
      CHECK,
      'notifications_type_valid',
    );
  });
});
