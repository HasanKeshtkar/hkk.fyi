// The doctor's changes are announced to the secretary (and only those, per the clinic's wish).
// A notification is written in the same transaction as the change: it exists if and only if the
// change does, and is kept until read, so a phone that was away still sees it.
import type { NotificationDto, NotificationPayload, NotificationType } from '../shared/api';
import { all, one, type Sql } from './db/sql';

export const UNREAD_LIST_LIMIT = 50;

export interface AppointmentFacts {
  id: string;
  startAt: number;
  patientName: string;
  patientPhone: string;
}

type NotificationRow = {
  id: string;
  recipient_id: string;
  appointment_id: string;
  type: string;
  payload: string;
  read_at: number | null;
  created_at: number;
};

const slim = (a: AppointmentFacts) => ({
  startAt: new Date(a.startAt).toISOString(),
  patientName: a.patientName,
  patientPhone: a.patientPhone,
});

function dto(r: NotificationRow): NotificationDto {
  return {
    id: r.id,
    type: r.type as NotificationType,
    appointmentId: r.appointment_id,
    payload: JSON.parse(r.payload) as NotificationPayload,
    createdAt: new Date(r.created_at).toISOString(),
    readAt: r.read_at === null ? null : new Date(r.read_at).toISOString(),
  };
}

/** Call inside the change's transaction. Returns the notification and its recipient, or null. */
export function recordNotification(
  sql: Sql,
  actor: { id: string; role: string },
  type: NotificationType,
  before: AppointmentFacts | null,
  after: AppointmentFacts,
): { recipientId: string; notification: NotificationDto } | null {
  if (actor.role !== 'doctor') return null;
  const recipient = one<{ id: string }>(sql, "SELECT id FROM users WHERE role = 'secretary'");
  if (!recipient) return null;
  const payload: NotificationPayload = { by: actor.id, before: before ? slim(before) : null, after: slim(after) };
  const id = crypto.randomUUID();
  sql.exec(
    'INSERT INTO notifications (id, recipient_id, appointment_id, type, payload, read_at, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?)',
    id,
    recipient.id,
    after.id,
    type,
    JSON.stringify(payload),
    Date.now(),
  );
  return {
    recipientId: recipient.id,
    notification: dto(one<NotificationRow>(sql, 'SELECT * FROM notifications WHERE id = ?', id)!),
  };
}

export function listUnread(sql: Sql, userId: string): { items: NotificationDto[]; count: number } {
  const items = all<NotificationRow>(
    sql,
    'SELECT * FROM notifications WHERE recipient_id = ? AND read_at IS NULL ORDER BY created_at DESC, id LIMIT ?',
    userId,
    UNREAD_LIST_LIMIT,
  ).map(dto);
  const count = one<{ n: number }>(sql, 'SELECT count(*) AS n FROM notifications WHERE recipient_id = ? AND read_at IS NULL', userId)!.n;
  return { items, count };
}

/** Marks the given notifications (or all) of this user as read; returns the ids that changed. */
export function markRead(storage: DurableObjectStorage, userId: string, ids: string[] | 'all'): string[] {
  const sql = storage.sql;
  return storage.transactionSync(() => {
    const unread = all<{ id: string }>(sql, 'SELECT id FROM notifications WHERE recipient_id = ? AND read_at IS NULL', userId).map(
      (r) => r.id,
    );
    const wanted = ids === 'all' ? unread : unread.filter((id) => ids.includes(id));
    const now = Date.now();
    for (const id of wanted) sql.exec('UPDATE notifications SET read_at = ? WHERE id = ?', now, id);
    return wanted;
  });
}
