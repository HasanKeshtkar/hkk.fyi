// Idempotent: creates the two users and the default weekly hours only where missing.
// `npm run db:seed -- --reset-passwords` re-hashes both passwords from the env.
import { eq } from 'drizzle-orm';
import { hashPassword, PASSWORD_MIN_LENGTH } from '../src/server/auth/password.js';
import { createDb, createPool } from '../src/server/db/client.js';
import { DEFAULT_WEEKLY_SCHEDULE } from '../src/server/db/defaults.js';
import { sessions, users, weeklySchedule } from '../src/server/db/schema.js';

function required(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    console.error(`${name} is not set`);
    process.exit(1);
  }
  return v;
}

const url = required('DATABASE_URL');
const resetPasswords = process.argv.includes('--reset-passwords');

const accounts = [
  { role: 'doctor', name: process.env.SEED_DOCTOR_NAME?.trim() || 'دکتر', password: required('SEED_DOCTOR_PASSWORD') },
  {
    role: 'secretary',
    name: process.env.SEED_SECRETARY_NAME?.trim() || 'منشی',
    password: required('SEED_SECRETARY_PASSWORD'),
  },
] as const;

for (const a of accounts) {
  if (a.password.length < PASSWORD_MIN_LENGTH) {
    console.error(`password for ${a.role} must be at least ${PASSWORD_MIN_LENGTH} characters`);
    process.exit(1);
  }
}

const pool = createPool(url, 1);
const db = createDb(pool);
try {
  for (const a of accounts) {
    const passwordHash = await hashPassword(a.password);
    const inserted = await db
      .insert(users)
      .values({ role: a.role, name: a.name, passwordHash })
      .onConflictDoNothing({ target: users.role })
      .returning({ id: users.id });
    if (inserted.length > 0) console.log(`created ${a.role}`);
    else if (resetPasswords) {
      // A new password also signs that user out everywhere.
      await db.transaction(async (tx) => {
        const [u] = await tx.update(users).set({ passwordHash }).where(eq(users.role, a.role)).returning({ id: users.id });
        if (u) await tx.delete(sessions).where(eq(sessions.userId, u.id));
      });
      console.log(`reset password for ${a.role} and signed out its sessions`);
    } else console.log(`${a.role} exists, left unchanged`);
  }

  const created = await db.insert(weeklySchedule).values([...DEFAULT_WEEKLY_SCHEDULE]).onConflictDoNothing().returning();
  console.log(`weekly schedule: ${created.length} day(s) seeded`);
} finally {
  await pool.end();
}
