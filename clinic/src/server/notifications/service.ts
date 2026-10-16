import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { NotificationDto, NotificationPayload, NotificationType } from '../../shared/api.js';
import type { Db, Queryable } from '../db/client.js';
import { notifications, users, type Appointment, type Notification } from '../db/schema.js';

/** The doctor's changes are announced to the secretary (and only those, per the clinic's wish). */
const NOTIFY_ROLE_FROM = 'doctor';
const NOTIFY_ROLE_TO = 'secretary';
export const UNREAD_LIST_LIMIT = 50;

function slim(a: Appointment) {
  return { startAt: a.startAt.toISOString(), patientName: a.patientName, patientPhone: a.patientPhone };
}

/**
 * Called inside the write's own transaction, so the notification exists if and only if the
 * change does. Returns the new row, or null when this change is not announced.
 */
export async function recordNotification(
  tx: Queryable,
  actor: { id: string; role?: string },
  type: NotificationType,
  before: Appointment | null,
  after: Appointment,
): Promise<Notification | null> {
  if (actor.role !== NOTIFY_ROLE_FROM) return null;
  const [recipient] = await tx.select({ id: users.id }).from(users).where(eq(users.role, NOTIFY_ROLE_TO));
  if (!recipient) return null;
  const payload: NotificationPayload = {
    by: actor.id,
    before: before ? slim(before) : null,
    after: slim(after),
  };
  const [row] = await tx
    .insert(notifications)
    .values({ recipientId: recipient.id, appointmentId: after.id, type, payload })
    .returning();
  return row ?? null;
}

export function notificationDto(n: Notification): NotificationDto {
  return {
    id: n.id,
    type: n.type as NotificationType,
    appointmentId: n.appointmentId,
    payload: n.payload as NotificationPayload,
    createdAt: n.createdAt.toISOString(),
    readAt: n.readAt ? n.readAt.toISOString() : null,
  };
}

export async function listUnread(db: Db, userId: string): Promise<{ items: NotificationDto[]; count: number }> {
  const unread = and(eq(notifications.recipientId, userId), isNull(notifications.readAt));
  const [rows, [total]] = await Promise.all([
    db.select().from(notifications).where(unread).orderBy(desc(notifications.createdAt)).limit(UNREAD_LIST_LIMIT),
    db.select({ n: sql<number>`count(*)::int` }).from(notifications).where(unread),
  ]);
  return { items: rows.map(notificationDto), count: total?.n ?? 0 };
}

/** Marks the given notifications (or all) of this user as read; returns the ids that changed. */
export async function markRead(db: Db, userId: string, ids: string[] | 'all'): Promise<string[]> {
  if (ids !== 'all' && ids.length === 0) return [];
  const where =
    ids === 'all'
      ? and(eq(notifications.recipientId, userId), isNull(notifications.readAt))
      : and(eq(notifications.recipientId, userId), isNull(notifications.readAt), inArray(notifications.id, ids));
  const rows = await db.update(notifications).set({ readAt: new Date() }).where(where).returning({ id: notifications.id });
  return rows.map((r) => r.id);
}
