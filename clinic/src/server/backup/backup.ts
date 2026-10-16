// Database backups with the standard PostgreSQL tools (pg_dump / pg_restore / psql).
//
// - A backup is one pg_dump file in custom format. It is written under a temporary name and
//   renamed when complete, so a file named clinic-*.dump is always a whole backup.
// - Daily backups keep the newest BACKUP_KEEP files; a "pre-restore" backup taken before every
//   restore is never pruned.
// - A restore replaces the whole database in ONE transaction: if anything fails, nothing changes.
// The password never appears on a command line (PGPASSWORD), and nothing here logs table data.
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { chmod, mkdir, mkdtemp, readdir, readFile, rename, rm, stat, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { clinicDateOf, clinicTimeOf } from '../../shared/time.js';

export const DAILY_PREFIX = 'clinic-';
export const PRE_RESTORE_PREFIX = 'pre-restore-';
const BACKUP_NAME = /^(?:clinic|pre-restore)-\d{4}-\d{2}-\d{2}_\d{4}(?:-\d+)?\.dump$/;
const PARTIAL_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface PgTarget {
  /** connection URI without the password */
  uri: string;
  env: NodeJS.ProcessEnv;
}

/** Splits the password off a postgres:// URL so it travels in the environment, not in argv. */
export function pgTarget(databaseUrl: string): PgTarget {
  const u = new URL(databaseUrl);
  const password = decodeURIComponent(u.password);
  u.password = '';
  const env: NodeJS.ProcessEnv = { ...process.env, PGCONNECT_TIMEOUT: '15', PGOPTIONS: '-c client_min_messages=warning' };
  if (password) env.PGPASSWORD = password;
  return { uri: u.toString(), env };
}

/** A PostgreSQL client program: from PG_BIN when set, else from PATH. */
export function pgProgram(name: 'pg_dump' | 'pg_restore' | 'psql', pgBin = process.env.PG_BIN): string {
  return pgBin ? path.join(pgBin, name) : name;
}

export function isBackupName(name: string): boolean {
  return BACKUP_NAME.test(name);
}

/** 'clinic-2026-10-16_0300.dump' in the clinic's local time. */
export function backupFileName(prefix: string, now: Date): string {
  return `${prefix}${clinicDateOf(now)}_${clinicTimeOf(now).replace(':', '')}.dump`;
}

export interface BackupFile {
  name: string;
  bytes: number;
  /** when it was written */
  at: Date;
}

/** Complete backups in `dir`, newest first. */
export async function listBackups(dir: string): Promise<BackupFile[]> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
  const files = await Promise.all(
    names.filter(isBackupName).map(async (name) => {
      const s = await stat(path.join(dir, name));
      return { name, bytes: s.size, at: s.mtime };
    }),
  );
  return files.sort((a, b) => b.at.getTime() - a.at.getTime() || b.name.localeCompare(a.name));
}

/** Runs a program; resolves on exit code 0, else rejects with its first error line. */
function run(cmd: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { env, stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr!.on('data', (d: Buffer) => {
      if (stderr.length < 4000) stderr += d.toString();
    });
    child.on('error', (err) => reject(new Error(`${path.basename(cmd)}: ${err.message}`)));
    child.on('close', (code) => {
      if (code === 0) return resolve();
      const lines = stderr.split('\n').filter((l) => l.trim() !== '');
      const line = lines.find((l) => /\b(ERROR|FATAL|error):/.test(l)) ?? lines[0] ?? '';
      reject(new Error(`${path.basename(cmd)} exited with code ${code}${line ? `: ${line.trim()}` : ''}`));
    });
  });
}

/** Runs a program and returns what it printed; rejects like run() on failure. */
function capture(cmd: string, args: string[], env: NodeJS.ProcessEnv): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (d: Buffer) => (out += d.toString()));
    child.stderr.on('data', (d: Buffer) => (err += d.toString()));
    child.on('error', (e) => reject(new Error(`${path.basename(cmd)}: ${e.message}`)));
    child.on('close', (code) =>
      code === 0 ? resolve(out) : reject(new Error(`${path.basename(cmd)} exited with code ${code}: ${err.split('\n')[0] ?? ''}`)),
    );
  });
}

const SET_LINE = /^SET ([a-z_][a-z0-9_.]*) = .*;$/;
const COPY_START = /^COPY .* FROM stdin;$/;

/**
 * Removes `SET name = …;` lines for settings the target server does not have. A newer pg_restore
 * writes settings only newer servers know (e.g. transaction_timeout, PostgreSQL 17+), which would
 * stop the restore on an older server. Table data (COPY blocks) is never touched.
 */
export function dropUnknownSettings(sql: string, known: ReadonlySet<string>): string {
  const out: string[] = [];
  let inCopy = false;
  for (const line of sql.split('\n')) {
    if (inCopy) {
      out.push(line);
      if (line === '\\.') inCopy = false;
      continue;
    }
    if (COPY_START.test(line)) inCopy = true;
    const m = SET_LINE.exec(line);
    if (m && !known.has(m[1]!)) continue;
    out.push(line);
  }
  return out.join('\n');
}

export interface BackupOptions {
  databaseUrl: string;
  dir: string;
  /** daily backups to keep (older ones are deleted); ignored for pre-restore backups */
  keep: number;
  prefix?: string;
  now?: Date;
  pgBin?: string;
}

/** Writes one backup; returns it. Deletes the oldest daily backups beyond `keep`. */
export async function runBackup(opts: BackupOptions): Promise<BackupFile> {
  const prefix = opts.prefix ?? DAILY_PREFIX;
  const now = opts.now ?? new Date();
  await mkdir(opts.dir, { recursive: true });

  let name = backupFileName(prefix, now);
  const existing = new Set(await readdir(opts.dir));
  for (let n = 2; existing.has(name); n++) name = backupFileName(prefix, now).replace(/\.dump$/, `-${n}.dump`);
  const final = path.join(opts.dir, name);
  const partial = `${final}.${process.pid}.partial`;

  const target = pgTarget(opts.databaseUrl);
  try {
    await run(
      pgProgram('pg_dump', opts.pgBin),
      ['--format=custom', '--no-owner', '--no-privileges', `--file=${partial}`, `--dbname=${target.uri}`],
      target.env,
    );
    await rename(partial, final);
  } catch (err) {
    await unlink(partial).catch(() => {});
    throw err;
  }

  if (prefix === DAILY_PREFIX) await prune(opts.dir, opts.keep);
  const s = await stat(final);
  return { name, bytes: s.size, at: s.mtime };
}

async function prune(dir: string, keep: number): Promise<void> {
  const daily = (await listBackups(dir)).filter((f) => f.name.startsWith(DAILY_PREFIX));
  for (const old of daily.slice(Math.max(1, keep))) await unlink(path.join(dir, old.name)).catch(() => {});
  // Leftovers of a backup that was cut off (e.g. the app was stopped mid-way).
  for (const name of await readdir(dir)) {
    if (!name.endsWith('.partial')) continue;
    const s = await stat(path.join(dir, name)).catch(() => null);
    if (s && Date.now() - s.mtimeMs > PARTIAL_MAX_AGE_MS) await unlink(path.join(dir, name)).catch(() => {});
  }
}

// Empties the app's schemas before the backup is loaded, inside the same transaction, so tables
// added by later versions do not survive a restore of an older backup (they would make the next
// start's migrations fail). Only objects the app owns live there.
const EMPTY_DATABASE = `
DROP SCHEMA IF EXISTS drizzle CASCADE;
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.tablename);
  END LOOP;
  FOR r IN SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public' LOOP
    EXECUTE format('DROP SEQUENCE IF EXISTS public.%I CASCADE', r.sequence_name);
  END LOOP;
  FOR r IN SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
           WHERE n.nspname = 'public' AND t.typtype IN ('e', 'd', 'c') AND t.typrelid = 0 LOOP
    EXECUTE format('DROP TYPE IF EXISTS public.%I CASCADE', r.typname);
  END LOOP;
END $$;
`;

export interface RestoreOptions {
  databaseUrl: string;
  /** the backup file to load */
  file: string;
  /** where the safety backup of the current data goes */
  dir: string;
  pgBin?: string;
  now?: Date;
}

/**
 * Replaces the whole database with a backup. First checks the file is a readable backup, then
 * backs up the current data (pre-restore-*.dump), then loads the backup in one transaction.
 */
export async function restoreBackup(opts: RestoreOptions): Promise<{ safetyBackup: BackupFile }> {
  const target = pgTarget(opts.databaseUrl);
  await run(pgProgram('pg_restore', opts.pgBin), ['--list', opts.file], target.env);

  const safetyBackup = await runBackup({
    databaseUrl: opts.databaseUrl,
    dir: opts.dir,
    keep: 0,
    prefix: PRE_RESTORE_PREFIX,
    now: opts.now,
    pgBin: opts.pgBin,
  });

  // pg_restore turns the whole backup into SQL first (a damaged file fails here, before anything
  // is touched); psql then runs EMPTY_DATABASE and that SQL in one transaction.
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'clinic-restore-'));
  const sqlFile = path.join(tmp, 'restore.sql');
  try {
    await run(
      pgProgram('pg_restore', opts.pgBin),
      ['--no-owner', '--no-privileges', `--file=${sqlFile}`, opts.file],
      target.env,
    );
    await chmod(sqlFile, 0o600);
    const settings = await capture(
      pgProgram('psql', opts.pgBin),
      ['--no-psqlrc', '--tuples-only', '--no-align', '-c', 'select name from pg_settings', `--dbname=${target.uri}`],
      target.env,
    );
    const known = new Set(settings.split('\n').map((l) => l.trim()).filter(Boolean));
    await writeFile(sqlFile, dropUnknownSettings(await readFile(sqlFile, 'utf8'), known), { mode: 0o600 });
    await run(
      pgProgram('psql', opts.pgBin),
      ['--no-psqlrc', '--quiet', '--single-transaction', '-v', 'ON_ERROR_STOP=1', '-c', EMPTY_DATABASE, '-f', sqlFile, `--dbname=${target.uri}`],
      target.env,
    );
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
  return { safetyBackup };
}

/** For the download endpoint: the file's stream, or null if no such backup. */
export async function openBackup(dir: string, name: string): Promise<{ stream: NodeJS.ReadableStream; bytes: number } | null> {
  if (!isBackupName(name)) return null;
  const file = path.join(dir, name);
  const s = await stat(file).catch(() => null);
  if (!s?.isFile()) return null;
  return { stream: createReadStream(file), bytes: s.size };
}
