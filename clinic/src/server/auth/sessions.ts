import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, lt } from 'drizzle-orm';
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

export async function resolveSession(db: Db, token: string | undefined, now = new Date()): Promise<ResolvedSession | null> {
  if (!token || !TOKEN_FORMAT.test(token)) return null;
  const id = hashToken(token);
  const [row] = await db
    .select({ user: users, lastSeenAt: sessions.lastSeenAt, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, now)));
  if (!row) return null;

  if (now.getTime() - row.lastSeenAt.getTime() < REFRESH_AFTER_MS) {
    return { id, user: row.user, expiresAt: row.expiresAt, refreshed: false };
  }
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await db.update(sessions).set({ lastSeenAt: now, expiresAt }).where(eq(sessions.id, id));
  return { id, user: row.user, expiresAt, refreshed: true };
}

export async function deleteSession(db: Db, token: string | undefined): Promise<void> {
  if (!token || !TOKEN_FORMAT.test(token)) return;
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

export async function purgeExpiredSessions(db: Db, now = new Date()): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
}
