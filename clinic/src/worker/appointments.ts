// Booking, editing, moving and cancelling. Everything a change does happens in one transaction:
// the checks (working hours, slot free, version), the write, the audit row and the notification.
// The Durable Object runs one request at a time between awaits and these transactions never
// await, so two people saving at once are strictly one after the other; the unique index on the
// slot is the last line of defence.
import type { AppointmentDto, NotificationDto } from '../shared/api';
import { normalizePatientName } from '../shared/patient-name';
import { normalizeIranMobile } from '../shared/phone';
import { checkSlotAgainstHours } from '../shared/schedule';
import { clinicDateOf } from '../shared/time';
import { all, isUniqueViolation, one, type Sql } from './db/sql';
import { HttpError } from './http';
import { recordNotification, type AppointmentFacts } from './notifications';
import { getDaySchedule } from './schedule';

const SLOT_MS = 30 * 60 * 1000;
const MIN_START_MS = Date.UTC(2000, 0, 1);
const MAX_START_MS = Date.UTC(2100, 0, 1);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type AppointmentRow = {
  id: string;
  start_at: number;
  patient_name: string;
  patient_phone: string;
  status: 'scheduled' | 'cancelled';
  created_by: string;
  updated_by: string;
  version: number;
  created_at: number;
  updated_at: number;
};

export interface Actor {
  id: string;
  role: string;
}

export interface WriteResult {
  appointment: AppointmentDto;
  /** the secretary's notification for this change, if any */
  notification: { recipientId: string; notification: NotificationDto } | null;
}

export function appointmentDto(r: AppointmentRow): AppointmentDto {
  return {
    id: r.id,
    startAt: new Date(r.start_at).toISOString(),
    patientName: r.patient_name,
    patientPhone: r.patient_phone,
    status: r.status,
    version: r.version,
    createdBy: r.created_by,
    updatedBy: r.updated_by,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

const facts = (r: AppointmentRow): AppointmentFacts => ({
  id: r.id,
  startAt: r.start_at,
  patientName: r.patient_name,
  patientPhone: r.patient_phone,
});

const snapshot = (r: AppointmentRow) => ({
  startAt: new Date(r.start_at).toISOString(),
  patientName: r.patient_name,
  patientPhone: r.patient_phone,
  status: r.status,
  version: r.version,
});

const invalid = (field: string) => new HttpError(400, { error: 'validation', field });

function validStartAt(iso: string): number {
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms % SLOT_MS !== 0 || ms < MIN_START_MS || ms >= MAX_START_MS) throw invalid('startAt');
  return ms;
}

function validName(name: string): string {
  const n = normalizePatientName(name);
  if (n === null) throw invalid('patientName');
  return n;
}

function validPhone(phone: string): string {
  const p = normalizeIranMobile(phone);
  if (p === null) throw invalid('patientPhone');
  return p;
}

function byId(sql: Sql, id: string): AppointmentRow | null {
  return one<AppointmentRow>(sql, 'SELECT * FROM appointments WHERE id = ?', id);
}

function activeAt(sql: Sql, startAt: number): AppointmentRow | null {
  return one<AppointmentRow>(sql, "SELECT * FROM appointments WHERE start_at = ? AND status <> 'cancelled'", startAt);
}

/** Live appointments with from <= start_at < to, earliest first. */
export function listActiveBetween(sql: Sql, from: number, to: number): AppointmentRow[] {
  return all<AppointmentRow>(
    sql,
    "SELECT * FROM appointments WHERE start_at >= ? AND start_at < ? AND status <> 'cancelled' ORDER BY start_at",
    from,
    to,
  );
}

/** A new or moved appointment must fall inside its day's working hours. */
function assertWithinHours(sql: Sql, startAt: number): void {
  const at = new Date(startAt);
  const rejection = checkSlotAgainstHours(at, getDaySchedule(sql, clinicDateOf(at)));
  if (rejection) throw new HttpError(422, { error: rejection });
}

function slotTaken(sql: Sql, startAt: number): HttpError {
  const holder = activeAt(sql, startAt);
  return new HttpError(409, { error: 'slot_taken', existing: holder ? appointmentDto(holder) : null });
}

function audit(sql: Sql, userId: string, entityId: string, action: string, before: AppointmentRow | null, after: AppointmentRow) {
  sql.exec(
    "INSERT INTO audit_log (user_id, entity, entity_id, action, before, after, at) VALUES (?, 'appointment', ?, ?, ?, ?, ?)",
    userId,
    entityId,
    action,
    before ? JSON.stringify(snapshot(before)) : null,
    JSON.stringify(snapshot(after)),
    Date.now(),
  );
}

export function createAppointment(
  storage: DurableObjectStorage,
  actor: Actor,
  input: { startAt: string; patientName: string; patientPhone: string },
): WriteResult {
  const startAt = validStartAt(input.startAt);
  const name = validName(input.patientName);
  const phone = validPhone(input.patientPhone);
  const sql = storage.sql;
  try {
    return storage.transactionSync(() => {
      assertWithinHours(sql, startAt);
      if (activeAt(sql, startAt)) throw slotTaken(sql, startAt);
      const id = crypto.randomUUID();
      const now = Date.now();
      sql.exec(
        `INSERT INTO appointments (id, start_at, patient_name, patient_phone, status, created_by, updated_by, version, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'scheduled', ?, ?, 1, ?, ?)`,
        id,
        startAt,
        name,
        phone,
        actor.id,
        actor.id,
        now,
        now,
      );
      const row = byId(sql, id)!;
      audit(sql, actor.id, id, 'create', null, row);
      const notification = recordNotification(sql, actor, 'created', null, facts(row));
      return { appointment: appointmentDto(row), notification };
    });
  } catch (err) {
    if (isUniqueViolation(err, 'appointments')) throw slotTaken(sql, startAt);
    throw err;
  }
}

type Patch = { startAt?: number; patientName?: string; patientPhone?: string; status?: 'cancelled' };

function changeAppointment(
  storage: DurableObjectStorage,
  actor: Actor,
  id: string,
  expectedVersion: number,
  action: 'update' | 'cancel',
  requested: Patch,
): WriteResult {
  if (!UUID.test(id)) throw new HttpError(404, { error: 'not_found' });
  const sql = storage.sql;
  try {
    return storage.transactionSync(() => {
      const before = byId(sql, id);
      if (!before) throw new HttpError(404, { error: 'not_found' });
      if (before.status === 'cancelled') throw new HttpError(409, { error: 'cancelled', current: appointmentDto(before) });
      if (before.version !== expectedVersion) {
        throw new HttpError(409, { error: 'version_conflict', current: appointmentDto(before) });
      }
      const patch: Patch = {};
      if (requested.startAt !== undefined && requested.startAt !== before.start_at) patch.startAt = requested.startAt;
      if (requested.patientName !== undefined && requested.patientName !== before.patient_name) patch.patientName = requested.patientName;
      if (requested.patientPhone !== undefined && requested.patientPhone !== before.patient_phone) patch.patientPhone = requested.patientPhone;
      if (requested.status !== undefined) patch.status = requested.status;
      // Nothing to change: no version bump, no audit row, no notification.
      if (Object.keys(patch).length === 0) return { appointment: appointmentDto(before), notification: null };
      // Only a move is checked against the hours: an appointment the hours no longer cover can
      // still have its name or phone corrected.
      if (patch.startAt !== undefined) {
        assertWithinHours(sql, patch.startAt);
        const holder = activeAt(sql, patch.startAt);
        if (holder && holder.id !== id) throw slotTaken(sql, patch.startAt);
      }
      sql.exec(
        `UPDATE appointments SET start_at = ?, patient_name = ?, patient_phone = ?, status = ?,
           version = version + 1, updated_by = ?, updated_at = ? WHERE id = ?`,
        patch.startAt ?? before.start_at,
        patch.patientName ?? before.patient_name,
        patch.patientPhone ?? before.patient_phone,
        patch.status ?? before.status,
        actor.id,
        Date.now(),
        id,
      );
      const after = byId(sql, id)!;
      audit(sql, actor.id, id, action, before, after);
      const notification = recordNotification(sql, actor, action === 'cancel' ? 'cancelled' : 'updated', facts(before), facts(after));
      return { appointment: appointmentDto(after), notification };
    });
  } catch (err) {
    if (requested.startAt !== undefined && isUniqueViolation(err, 'appointments')) throw slotTaken(sql, requested.startAt);
    throw err;
  }
}

/** Edits name/phone and/or moves the appointment to another slot. */
export function updateAppointment(
  storage: DurableObjectStorage,
  actor: Actor,
  id: string,
  expectedVersion: number,
  changes: { startAt?: string; patientName?: string; patientPhone?: string },
): WriteResult {
  const patch: Patch = {};
  if (changes.startAt !== undefined) patch.startAt = validStartAt(changes.startAt);
  if (changes.patientName !== undefined) patch.patientName = validName(changes.patientName);
  if (changes.patientPhone !== undefined) patch.patientPhone = validPhone(changes.patientPhone);
  return changeAppointment(storage, actor, id, expectedVersion, 'update', patch);
}

export function cancelAppointment(storage: DurableObjectStorage, actor: Actor, id: string, expectedVersion: number): WriteResult {
  return changeAppointment(storage, actor, id, expectedVersion, 'cancel', { status: 'cancelled' });
}
