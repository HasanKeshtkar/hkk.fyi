// Postgres error fields we rely on. Raw errors must never be logged or rethrown as-is:
// pg puts the whole failing row (patient name and phone) in `detail`, and Drizzle's
// DrizzleQueryError puts every bind parameter in its `message` and `stack`.
export interface PgError {
  code: string;
  constraint?: string;
}

export const PG_UNIQUE_VIOLATION = '23505';
export const PG_CHECK_VIOLATION = '23514';
export const PG_DEADLOCK = '40P01';
export const PG_SERIALIZATION_FAILURE = '40001';

/** Finds the Postgres error behind a (possibly Drizzle-wrapped) error. */
export function pgErrorOf(err: unknown): PgError | null {
  let cur: unknown = err;
  for (let depth = 0; cur && depth < 5; depth++) {
    if (typeof cur === 'object' && cur !== null) {
      const c = cur as { code?: unknown; constraint?: unknown; cause?: unknown };
      if (typeof c.code === 'string' && /^[0-9A-Z]{5}$/.test(c.code)) {
        return { code: c.code, constraint: typeof c.constraint === 'string' ? c.constraint : undefined };
      }
      cur = c.cause;
    } else {
      break;
    }
  }
  return null;
}

export function isConstraintViolation(err: unknown, constraint: string): boolean {
  return pgErrorOf(err)?.constraint === constraint;
}

/**
 * A database failure stripped of everything but the SQLSTATE code and constraint name.
 * Deliberately has no `cause`: the original error carries patient data.
 */
export class DatabaseError extends Error {
  constructor(
    readonly code: string,
    readonly constraint?: string,
  ) {
    super(`database error ${code}${constraint ? ` (${constraint})` : ''}`);
    this.name = 'DatabaseError';
  }
}

export function sanitizeDbError(err: unknown): DatabaseError {
  const pg = pgErrorOf(err);
  return new DatabaseError(pg?.code ?? 'unknown', pg?.constraint);
}
