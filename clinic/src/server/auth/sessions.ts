import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, inArray, lt } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { sessions, users, type User } from '../db/schema.js';

/** Sliding lifetime: every day of use pushes expiry this far out, so a phone in daily use stays signed in. */
export const SESSION_TTL_MS = 180 * 24 * 60 * 60 * 1000;
const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;
const TOKEN_FORMAT = /^[A-Za-z0-9_-]{43}$/; // 32 random bytes, base64url

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface ResolvedSession {
  /** the stored id (hash of the token) */
  id: string;
  user: User;
  expiresAt: Date;
  /** true when the expiry was just extended, so the cookie should be re-sent */
  refreshed: boolean;
}

export async function createSession(db: Db, userId: string, now = new Date()): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id: hashToken(token), userId, createdAt: now, lastSeenAt: now, expiresAt });
  return { token, expiresAt };
}

/**
 * The session a cookie token stands for, or null. With `slide` (the default) a session last seen
 * over a day ago has its expiry pushed out; the caller must then re-send the cookie. Callers that
 * cannot send a cookie (the realtime handshake) pass `slide: false`, so the stored expiry never
 * runs ahead of the browser's cookie.
 */
export async function resolveSession(
  db: Db,
  token: string | undefined,
  now = new Date(),
  { slide = true }: { slide?: boolean } = {},
): Promise<ResolvedSession | null> {
  if (!token || !TOKEN_FORMAT.test(token)) return null;
  const id = hashToken(token);
  const [row] = await db
    .select({ user: users, lastSeenAt: sessions.lastSeenAt, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, now)));
  if (!row) return null;

  if (!slide || now.getTime() - row.lastSeenAt.getTime() < REFRESH_AFTER_MS) {
    return { id, user: row.user, expiresAt: row.expiresAt, refreshed: false };
  }
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await db.update(sessions).set({ lastSeenAt: now, expiresAt }).where(eq(sessions.id, id));
  return { id, user: row.user, expiresAt, refreshed: true };
}

/** Which of these session ids are still valid (not deleted, not expired). */
export async function liveSessionIds(db: Db, ids: string[], now = new Date()): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(inArray(sessions.id, ids), gt(sessions.expiresAt, now)));
  return new Set(rows.map((r) => r.id));
}

export async function deleteSession(db: Db, token: string | undefined): Promise<void> {
  if (!token || !TOKEN_FORMAT.test(token)) return;
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

export async function purgeExpiredSessions(db: Db, now = new Date()): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
}
