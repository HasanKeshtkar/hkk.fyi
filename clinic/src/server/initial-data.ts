// First start on a new server: creates whatever is missing, so setting up needs no commands.
// - the default weekly hours (only weekdays that have no row yet);
// - each of the two users that does not exist yet, from SEED_<ROLE>_NAME / SEED_<ROLE>_PASSWORD.
// Existing users and hours are never changed here (password changes: scripts/seed.ts).
import { hashPassword, PASSWORD_MIN_LENGTH } from './auth/password.js';
import type { Db } from './db/client.js';
import { DEFAULT_WEEKLY_SCHEDULE } from './db/defaults.js';
import { users, weeklySchedule } from './db/schema.js';

const ROLES = [
  { role: 'doctor', env: 'DOCTOR', defaultName: 'دکتر' },
  { role: 'secretary', env: 'SECRETARY', defaultName: 'منشی' },
] as const;

interface Log {
  info: (o: object, msg: string) => void;
  warn: (o: object, msg: string) => void;
}

export async function ensureInitialData(db: Db, env: NodeJS.ProcessEnv, log: Log): Promise<void> {
  const added = await db.insert(weeklySchedule).values([...DEFAULT_WEEKLY_SCHEDULE]).onConflictDoNothing().returning();
  if (added.length > 0) log.info({ days: added.length }, 'default working hours created');

  const existing = new Set((await db.select({ role: users.role }).from(users)).map((u) => u.role));
  for (const r of ROLES) {
    if (existing.has(r.role)) continue;
    const password = env[`SEED_${r.env}_PASSWORD`]?.trim() ?? '';
    if (password.length < PASSWORD_MIN_LENGTH) {
      log.warn({ role: r.role }, `no ${r.role} account yet: set SEED_${r.env}_PASSWORD (at least ${PASSWORD_MIN_LENGTH} characters)`);
      continue;
    }
    const name = env[`SEED_${r.env}_NAME`]?.trim() || r.defaultName;
    const created = await db
      .insert(users)
      .values({ role: r.role, name, passwordHash: await hashPassword(password) })
      .onConflictDoNothing({ target: users.role })
      .returning({ id: users.id });
    if (created.length > 0) log.info({ role: r.role }, 'account created');
  }
}
