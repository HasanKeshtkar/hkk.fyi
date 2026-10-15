import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

export const userRole = pgEnum('user_role', ['doctor', 'secretary']);
export const appointmentStatus = pgEnum('appointment_status', ['scheduled', 'cancelled']);

// Exactly one doctor and one secretary: the login screen picks a role, then asks for the password.
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    role: userRole('role').notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('users_role_uq').on(t.role),
    check('users_name_not_blank', sql`char_length(btrim(name)) > 0`),
  ],
);

// The cookie carries a random token; only its SHA-256 is stored, so a leaked table cannot be replayed.
export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    lastSeenAt: timestamptz('last_seen_at').notNull().defaultNow(),
    expiresAt: timestamptz('expires_at').notNull(),
  },
  (t) => [index('sessions_user_id_idx').on(t.userId), index('sessions_expires_at_idx').on(t.expiresAt)],
);

export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    startAt: timestamptz('start_at').notNull(),
    patientName: text('patient_name').notNull(),
    patientPhone: text('patient_phone').notNull(),
    status: appointmentStatus('status').notNull().default('scheduled'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    updatedBy: uuid('updated_by')
      .notNull()
      .references(() => users.id),
    version: integer('version').notNull().default(1),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (t) => [
    // One live appointment per slot. Cancelled rows keep their start_at for history but free the slot.
    uniqueIndex('appointments_active_slot_uq').on(t.startAt).where(sql`status <> 'cancelled'`),
    // Epoch seconds are timezone-independent. Tehran is UTC+03:30, a whole number of half hours,
    // so :00/:30 in Tehran is exactly "epoch divisible by 1800" (this also rejects stray seconds).
    check('appointments_start_on_half_hour', sql`extract(epoch from start_at) % 1800 = 0`),
    check('appointments_phone_format', sql`patient_phone ~ '^09[0-9]{9}$'`),
    check(
      'appointments_name_valid',
      sql`char_length(patient_name) between 1 and 100 and patient_name = btrim(patient_name) and patient_name !~ '[[:cntrl:]]'`,
    ),
    check('appointments_version_positive', sql`version >= 1`),
  ],
);

// weekday follows JavaScript's Date#getDay(): 0 = Sunday … 6 = Saturday.
// Start/end are kept while a day is closed so reopening it restores the previous hours.
export const weeklySchedule = pgTable(
  'weekly_schedule',
  {
    weekday: smallint('weekday').primaryKey(),
    isOpen: boolean('is_open').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    // Optimistic concurrency, as for appointments: an edit made from a stale screen is refused.
    version: integer('version').notNull().default(1),
    updatedBy: uuid('updated_by').references(() => users.id),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (t) => [
    check('weekly_schedule_weekday_range', sql`weekday between 0 and 6`),
    check('weekly_schedule_version_positive', sql`version >= 1`),
    check('weekly_schedule_time_order', sql`start_time < end_time`),
    check(
      'weekly_schedule_half_hour',
      sql`extract(epoch from start_time) % 1800 = 0 and extract(epoch from end_time) % 1800 = 0`,
    ),
  ],
);

// Override versions come from one sequence and are never reused, not even after a delete and
// re-create of the same date: otherwise a screen still holding "version 1" of a removed override
// would match the new one and silently overwrite it.
export const dateOverrideVersionSeq = pgSequence('date_overrides_version_seq');

// A per-date exception: closed (holiday/leave) or open with different hours. Takes precedence over weekly_schedule.
export const dateOverrides = pgTable(
  'date_overrides',
  {
    date: date('date', { mode: 'string' }).primaryKey(),
    isOpen: boolean('is_open').notNull(),
    startTime: time('start_time'),
    endTime: time('end_time'),
    note: text('note'),
    version: integer('version')
      .notNull()
      .default(sql`nextval('date_overrides_version_seq')`),
    updatedBy: uuid('updated_by').references(() => users.id),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (t) => [
    check('date_overrides_version_positive', sql`version >= 1`),
    check(
      'date_overrides_hours_match_open',
      sql`(is_open and start_time is not null and end_time is not null and start_time < end_time)
        or (not is_open and start_time is null and end_time is null)`,
    ),
    check(
      'date_overrides_half_hour',
      sql`(start_time is null or extract(epoch from start_time) % 1800 = 0)
        and (end_time is null or extract(epoch from end_time) % 1800 = 0)`,
    ),
    check('date_overrides_note_length', sql`note is null or char_length(note) <= 200`),
  ],
);

export const auditLog = pgTable(
  'audit_log',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid('user_id').references(() => users.id),
    entity: text('entity').notNull(),
    entityId: text('entity_id').notNull(),
    action: text('action').notNull(),
    before: jsonb('before'),
    after: jsonb('after'),
    at: timestamptz('at').notNull().defaultNow(),
  },
  (t) => [
    check('audit_log_entity_valid', sql`entity in ('appointment', 'weekly_schedule', 'date_override')`),
    check('audit_log_action_valid', sql`action in ('create', 'update', 'cancel', 'delete')`),
    index('audit_log_entity_idx').on(t.entity, t.entityId),
    index('audit_log_at_idx').on(t.at),
  ],
);

// payload snapshots the appointment before/after the change, so the message stays accurate
// even after the appointment is edited again.
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    appointmentId: uuid('appointment_id')
      .notNull()
      .references(() => appointments.id),
    type: text('type').notNull(),
    payload: jsonb('payload').notNull(),
    readAt: timestamptz('read_at'),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
  },
  (t) => [
    check('notifications_type_valid', sql`type in ('created', 'updated', 'cancelled')`),
    index('notifications_unread_idx').on(t.recipientId, t.createdAt).where(sql`read_at is null`),
  ],
);

export type User = typeof users.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type WeeklyScheduleRow = typeof weeklySchedule.$inferSelect;
export type DateOverrideRow = typeof dateOverrides.$inferSelect;
