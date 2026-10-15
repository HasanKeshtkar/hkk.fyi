import { and, asc, eq, gte, lt, ne } from 'drizzle-orm';
import { normalizePatientName } from '../../shared/patient-name.js';
import { normalizeIranMobile } from '../../shared/phone.js';
import { checkSlotAgainstHours, type HoursRejection } from '../../shared/schedule.js';
import { clinicDateOf } from '../../shared/time.js';
import type { Db, Queryable } from '../db/client.js';
import { PG_DEADLOCK, PG_SERIALIZATION_FAILURE, pgErrorOf, sanitizeDbError } from '../db/errors.js';
import { appointments, auditLog, type Appointment } from '../db/schema.js';
import { getDaySchedule } from '../schedule/service.js';

/** Base class of the expected, user-facing outcomes. Messages never contain patient data. */
export abstract class AppointmentError extends Error {}

/** Attaches a row without making it enumerable, so logging or JSON-serializing the error does not dump patient data. */
function attachRow<T extends object>(err: T, key: string, row: Appointment | null): void {
  Object.defineProperty(err, key, { value: row, enumerable: false });
}

export class AppointmentValidationError extends AppointmentError {
  constructor(readonly field: 'patientName' | 'patientPhone' | 'startAt') {
    super(`invalid ${field}`);
  }
}

/** The slot already has a live appointment. `existing` is that appointment (null if it vanished meanwhile). */
export class SlotTakenError extends AppointmentError {
  declare readonly existing: Appointment | null;
  constructor(existing: Appointment | null) {
    super('slot taken');
    attachRow(this, 'existing', existing);
  }
}

/** Someone changed the appointment after the caller read it. `current` is the latest committed row. */
export class VersionConflictError extends AppointmentError {
  declare readonly current: Appointment;
  constructor(current: Appointment) {
    super('version conflict');
    attachRow(this, 'current', current);
  }
}

export class AppointmentNotFoundError extends AppointmentError {
  constructor() {
    super('appointment not found');
  }
}

/** Edits and cancels are refused on a cancelled appointment. `current` is the cancelled row. */
export class AppointmentCancelledError extends AppointmentError {
  declare readonly current: Appointment;
  constructor(current: Appointment) {
    super('appointment cancelled');
    attachRow(this, 'current', current);
  }
}

/** The slot is not inside the working hours of its day (or the day is closed). */
export class OutsideHoursError extends AppointmentError {
  constructor(readonly reason: HoursRejection) {
    super(reason);
  }
}

export interface Actor {
  id: string;
}

export interface NewAppointment {
  startAt: Date;
  patientName: string;
  patientPhone: string;
}

export interface AppointmentChanges {
  startAt?: Date;
  patientName?: string;
  patientPhone?: string;
}

const SLOT_MS = 30 * 60 * 1000;
const MIN_START_MS = Date.UTC(2000, 0, 1);
const MAX_START_MS = Date.UTC(2100, 0, 1);
const ACTIVE_SLOT_CONSTRAINT = 'appointments_active_slot_uq';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const RETRYABLE = new Set([PG_DEADLOCK, PG_SERIALIZATION_FAILURE]);
const MAX_ATTEMPTS = 3;

function snapshot(a: Appointment) {
  return {
    startAt: a.startAt.toISOString(),
    patientName: a.patientName,
    patientPhone: a.patientPhone,
    status: a.status,
    version: a.version,
  };
}

function validStartAt(startAt: Date): Date {
  const ms = startAt.getTime();
  if (!Number.isFinite(ms) || ms % SLOT_MS !== 0 || ms < MIN_START_MS || ms >= MAX_START_MS) {
    throw new AppointmentValidationError('startAt');
  }
  return startAt;
}

function validName(name: string): string {
  const n = normalizePatientName(name);
  if (n === null) throw new AppointmentValidationError('patientName');
  return n;
}

function validPhone(phone: string): string {
  const p = normalizeIranMobile(phone);
  if (p === null) throw new AppointmentValidationError('patientPhone');
  return p;
}

/** Live (not cancelled) appointments with from <= start_at < to, earliest first. */
export function listActiveBetween(db: Queryable, from: Date, to: Date): Promise<Appointment[]> {
  return db
    .select()
    .from(appointments)
    .where(and(gte(appointments.startAt, from), lt(appointments.startAt, to), ne(appointments.status, 'cancelled')))
    .orderBy(asc(appointments.startAt));
}

/** Server-side guard: a new or moved appointment must fall inside its day's working hours. */
async function assertWithinHours(tx: Queryable, startAt: Date): Promise<void> {
  const day = await getDaySchedule(tx, clinicDateOf(startAt));
  const rejection = checkSlotAgainstHours(startAt, day);
  if (rejection) throw new OutsideHoursError(rejection);
}

export async function findActiveAt(db: Db, startAt: Date): Promise<Appointment | null> {
  const [row] = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.startAt, startAt), ne(appointments.status, 'cancelled')));
  return row ?? null;
}

/**
 * Runs one write transaction and turns every failure into either a domain error or a sanitized
 * DatabaseError. Deadlocks are retried: two moves crossing into each other's slots can deadlock
 * inside the unique-index check, and the retry then sees the committed state and answers cleanly.
 */
async function runWrite<T>(db: Db, write: () => Promise<T>, targetSlot: () => Date | undefined): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await write();
    } catch (err) {
      if (err instanceof AppointmentError) throw err;
      const pg = pgErrorOf(err);
      if (pg && RETRYABLE.has(pg.code) && attempt < MAX_ATTEMPTS) continue;
      const slot = targetSlot();
      if (slot && pg?.constraint === ACTIVE_SLOT_CONSTRAINT) {
        throw new SlotTakenError(await findActiveAt(db, slot).catch(() => null));
      }
      throw sanitizeDbError(err);
    }
  }
}

export async function createAppointment(db: Db, actor: Actor, input: NewAppointment): Promise<Appointment> {
  const values = {
    startAt: validStartAt(input.startAt),
    patientName: validName(input.patientName),
    patientPhone: validPhone(input.patientPhone),
    createdBy: actor.id,
    updatedBy: actor.id,
  };
  return runWrite(
    db,
    () =>
      db.transaction(async (tx) => {
        await assertWithinHours(tx, values.startAt);
        const [row] = await tx.insert(appointments).values(values).returning();
        if (!row) throw new Error('insert returned no row');
        await tx.insert(auditLog).values({
          userId: actor.id,
          entity: 'appointment',
          entityId: row.id,
          action: 'create',
          before: null,
          after: snapshot(row),
        });
        return row;
      }),
    () => values.startAt,
  );
}

type AppointmentPatch = Partial<Pick<Appointment, 'startAt' | 'patientName' | 'patientPhone' | 'status'>>;

function changedFields(before: Appointment, patch: AppointmentPatch): AppointmentPatch {
  const out: AppointmentPatch = {};
  if (patch.startAt !== undefined && patch.startAt.getTime() !== before.startAt.getTime()) out.startAt = patch.startAt;
  if (patch.patientName !== undefined && patch.patientName !== before.patientName) out.patientName = patch.patientName;
  if (patch.patientPhone !== undefined && patch.patientPhone !== before.patientPhone) out.patientPhone = patch.patientPhone;
  if (patch.status !== undefined && patch.status !== before.status) out.status = patch.status;
  return out;
}

/**
 * Applies `patch` to the appointment if it is still at `expectedVersion`.
 * The row lock (SELECT … FOR UPDATE) serializes concurrent writers: a writer that waited
 * re-reads the committed row, sees the bumped version and gets VersionConflictError.
 */
async function changeAppointment(
  db: Db,
  actor: Actor,
  id: string,
  expectedVersion: number,
  action: 'update' | 'cancel',
  requested: AppointmentPatch,
): Promise<Appointment> {
  if (!UUID.test(id)) throw new AppointmentNotFoundError();
  return runWrite(
    db,
    () =>
      db.transaction(async (tx) => {
        const [before] = await tx.select().from(appointments).where(eq(appointments.id, id)).for('update');
        if (!before) throw new AppointmentNotFoundError();
        if (before.status === 'cancelled') throw new AppointmentCancelledError(before);
        if (before.version !== expectedVersion) throw new VersionConflictError(before);

        const patch = changedFields(before, requested);
        if (Object.keys(patch).length === 0) return before; // nothing to change: no version bump, no audit row
        // Only a move is checked against the hours: editing the name/phone of an appointment
        // that the hours no longer cover must stay possible.
        if (patch.startAt) await assertWithinHours(tx, patch.startAt);
        const [after] = await tx
          .update(appointments)
          .set({ ...patch, version: before.version + 1, updatedBy: actor.id, updatedAt: new Date() })
          .where(eq(appointments.id, before.id))
          .returning();
        if (!after) throw new Error('update returned no row');

        await tx.insert(auditLog).values({
          userId: actor.id,
          entity: 'appointment',
          entityId: before.id,
          action,
          before: snapshot(before),
          after: snapshot(after),
        });
        return after;
      }),
    () => requested.startAt,
  );
}

/** Edits name/phone and/or moves the appointment to another slot. */
export async function updateAppointment(
  db: Db,
  actor: Actor,
  id: string,
  expectedVersion: number,
  changes: AppointmentChanges,
): Promise<Appointment> {
  const patch: AppointmentPatch = {};
  if (changes.startAt !== undefined) patch.startAt = validStartAt(changes.startAt);
  if (changes.patientName !== undefined) patch.patientName = validName(changes.patientName);
  if (changes.patientPhone !== undefined) patch.patientPhone = validPhone(changes.patientPhone);
  return changeAppointment(db, actor, id, expectedVersion, 'update', patch);
}

export async function cancelAppointment(db: Db, actor: Actor, id: string, expectedVersion: number): Promise<Appointment> {
  return changeAppointment(db, actor, id, expectedVersion, 'cancel', { status: 'cancelled' });
}
