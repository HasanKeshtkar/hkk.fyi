// Backups inside the Durable Object: a JSON copy of the clinic's data, taken daily (cron) and
// before every restore, kept in 500 000-character chunks (rows here are limited to 2 MB).
// A restore replaces appointments, notifications and working hours in one transaction; accounts,
// sessions and the audit log are left as they are (the restore itself is audited). Backups hold
// no password hashes.
import { clinicDateOf, clinicTimeOf } from '../shared/time';
import { all, one, type Sql } from './db/sql';
import { HttpError } from './http';

const CHUNK_CHARS = 500_000;
const FORMAT = 'clinic-backup';
const NAME = /^(?:clinic|pre-restore)-\d{4}-\d{2}-\d{2}_\d{4}(?:-\d+)?\.json$/;
/** Restored, in this order (parents before children). */
const DATA_TABLES = ['weekly_schedule', 'date_overrides', 'appointments', 'notifications'] as const;
/** Saved for the record but not restored. */
const KEPT_TABLES = ['users', 'audit_log', 'counters'] as const;
/** What a backup holds of a table: everything, except the password hashes (never restored). */
const SELECT: Record<string, string> = { users: 'SELECT id, role, name, created_at FROM users' };
const PRE_RESTORE_KEEP = 10;

export interface BackupInfo {
  name: string;
  kind: 'daily' | 'pre-restore';
  bytes: number;
  at: number;
}

interface BackupFile {
  format: typeof FORMAT;
  version: 1;
  createdAt: string;
  tables: Record<string, Record<string, SqlStorageValue>[]>;
}

export function isBackupName(name: string): boolean {
  return NAME.test(name);
}

function baseName(prefix: string, now: Date): string {
  return `${prefix}-${clinicDateOf(now)}_${clinicTimeOf(now).replace(':', '')}`;
}

export function listBackups(sql: Sql): BackupInfo[] {
  return all<{ name: string; kind: 'daily' | 'pre-restore'; bytes: number; created_at: number }>(
    sql,
    'SELECT name, kind, bytes, created_at FROM backups ORDER BY created_at DESC, name DESC',
  ).map((r) => ({ name: r.name, kind: r.kind, bytes: r.bytes, at: r.created_at }));
}

/** Writes a backup of the current data (call inside a transaction, or on its own). */
export function writeBackup(sql: Sql, kind: 'daily' | 'pre-restore', keep: number, now = new Date()): BackupInfo {
  const tables: BackupFile['tables'] = {};
  for (const t of [...KEPT_TABLES, ...DATA_TABLES]) tables[t] = all(sql, SELECT[t] ?? `SELECT * FROM ${t}`);
  const text = JSON.stringify({ format: FORMAT, version: 1, createdAt: now.toISOString(), tables } satisfies BackupFile);

  const base = baseName(kind === 'daily' ? 'clinic' : 'pre-restore', now);
  let name = `${base}.json`;
  for (let n = 2; one(sql, 'SELECT 1 AS x FROM backups WHERE name = ?', name); n++) name = `${base}-${n}.json`;
  const bytes = new TextEncoder().encode(text).length;
  sql.exec('INSERT INTO backups (name, kind, bytes, created_at) VALUES (?, ?, ?, ?)', name, kind, bytes, now.getTime());
  for (let i = 0, seq = 0; i < text.length; seq++) {
    let end = Math.min(i + CHUNK_CHARS, text.length);
    // Never between the two halves of a character outside the BMP (an emoji): a lone half is
    // stored as a replacement character.
    const last = text.charCodeAt(end - 1);
    if (end < text.length && last >= 0xd800 && last <= 0xdbff) end--;
    sql.exec('INSERT INTO backup_chunks (name, seq, data) VALUES (?, ?, ?)', name, seq, text.slice(i, end));
    i = end;
  }

  // Keep the newest `keep` of this kind.
  const max = kind === 'daily' ? Math.max(1, keep) : PRE_RESTORE_KEEP;
  const old = all<{ name: string }>(
    sql,
    'SELECT name FROM backups WHERE kind = ? ORDER BY created_at DESC, name DESC LIMIT -1 OFFSET ?',
    kind,
    max,
  );
  for (const o of old) {
    sql.exec('DELETE FROM backup_chunks WHERE name = ?', o.name);
    sql.exec('DELETE FROM backups WHERE name = ?', o.name);
  }
  return { name, kind, bytes, at: now.getTime() };
}

/** The backup as the JSON text it was written as, or null. */
export function readBackup(sql: Sql, name: string): string | null {
  if (!isBackupName(name) || !one(sql, 'SELECT 1 AS x FROM backups WHERE name = ?', name)) return null;
  return all<{ data: string }>(sql, 'SELECT data FROM backup_chunks WHERE name = ? ORDER BY seq', name)
    .map((c) => c.data)
    .join('');
}

/**
 * Replaces the clinic's data with a backup, after backing up the current data. One transaction:
 * if anything is wrong with the backup, nothing changes. Returns the safety backup.
 */
export function restoreBackup(storage: DurableObjectStorage, userId: string, name: string, keep: number): BackupInfo {
  const sql = storage.sql;
  const text = readBackup(sql, name);
  if (text === null) throw new HttpError(404, { error: 'not_found' });
  let file: BackupFile;
  try {
    file = JSON.parse(text) as BackupFile;
  } catch {
    throw new HttpError(422, { error: 'bad_request' });
  }
  if (file.format !== FORMAT || file.version !== 1 || typeof file.tables !== 'object') {
    throw new HttpError(422, { error: 'bad_request' });
  }
  return storage.transactionSync(() => {
    const safety = writeBackup(sql, 'pre-restore', keep);
    // Versions must never repeat either: a phone still holding a version handed out before the
    // restore must get a conflict, and live changes after it must look newer than anything seen.
    const maxVersion = (t: string) => one<{ m: number }>(sql, `SELECT coalesce(max(version), 0) AS m FROM ${t}`)!.m;
    const offsets = { appointments: maxVersion('appointments'), weekly_schedule: maxVersion('weekly_schedule') };
    for (const t of [...DATA_TABLES].reverse()) sql.exec(`DELETE FROM ${t}`);
    for (const t of DATA_TABLES) {
      for (const row of file.tables[t] ?? []) {
        const cols = Object.keys(row);
        if (cols.some((c) => !/^[a-z_]+$/.test(c))) throw new HttpError(422, { error: 'bad_request' });
        sql.exec(
          `INSERT INTO ${t} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
          ...cols.map((c) => row[c]),
        );
      }
    }
    for (const [t, offset] of Object.entries(offsets)) sql.exec(`UPDATE ${t} SET version = version + ?`, offset);
    // Override versions come from a counter: continue from the higher of the two.
    const saved = (file.tables.counters ?? []).find((c) => c.name === 'override_version');
    if (saved && typeof saved.value === 'number') {
      sql.exec(
        "INSERT INTO counters (name, value) VALUES ('override_version', ?) ON CONFLICT(name) DO UPDATE SET value = max(value, excluded.value)",
        saved.value,
      );
    }
    sql.exec(
      "INSERT INTO audit_log (user_id, entity, entity_id, action, before, after, at) VALUES (?, 'backup', ?, 'restore', ?, NULL, ?)",
      userId,
      name,
      JSON.stringify({ safetyBackup: safety.name }),
      Date.now(),
    );
    return safety;
  });
}
