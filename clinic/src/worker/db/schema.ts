// The clinic's database: SQLite inside the Durable Object. The rules that keep the data correct
// live here, not only in the code: one live appointment per slot, starts on :00/:30, phone format,
// one account per role, half-hour working hours.
//
// Times: instants are epoch milliseconds (INTEGER); wall-clock times are 'HH:MM' text; dates
// 'YYYY-MM-DD'. Tehran is UTC+03:30, a whole number of half hours, so ":00/:30 in Tehran" is
// exactly "epoch ms divisible by 1 800 000".

/** Applied in order, each once. Never edit one that has shipped: add a new one. */
export const MIGRATIONS: string[] = [
  `
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL UNIQUE CHECK (role IN ('doctor', 'secretary')),
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  ) STRICT;

  -- The cookie carries a random token; only its SHA-256 is stored.
  CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  ) STRICT;
  CREATE INDEX sessions_user_idx ON sessions(user_id);

  CREATE TABLE appointments (
    id TEXT PRIMARY KEY,
    start_at INTEGER NOT NULL CHECK (start_at % 1800000 = 0),
    patient_name TEXT NOT NULL
      CHECK (length(patient_name) BETWEEN 1 AND 100 AND patient_name = trim(patient_name)),
    patient_phone TEXT NOT NULL
      CHECK (length(patient_phone) = 11 AND patient_phone GLOB '09[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'),
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled')),
    created_by TEXT NOT NULL REFERENCES users(id),
    updated_by TEXT NOT NULL REFERENCES users(id),
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  ) STRICT;
  -- One live appointment per slot. Cancelled rows keep their start_at for history but free the slot.
  CREATE UNIQUE INDEX appointments_active_slot_uq ON appointments(start_at) WHERE status <> 'cancelled';
  CREATE INDEX appointments_start_idx ON appointments(start_at);

  -- weekday as JavaScript's Date#getDay(): 0 = Sunday … 6 = Saturday. Hours are kept while closed.
  CREATE TABLE weekly_schedule (
    weekday INTEGER PRIMARY KEY CHECK (weekday BETWEEN 0 AND 6),
    is_open INTEGER NOT NULL CHECK (is_open IN (0, 1)),
    start_time TEXT NOT NULL CHECK (start_time GLOB '[0-2][0-9]:[03]0'),
    end_time TEXT NOT NULL CHECK (end_time GLOB '[0-2][0-9]:[03]0' AND end_time <= '24:00'),
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    updated_by TEXT REFERENCES users(id),
    updated_at INTEGER NOT NULL,
    CHECK (start_time < end_time)
  ) STRICT;

  -- Closed (holiday/leave) or different hours on one date; wins over weekly_schedule.
  -- Versions come from a counter and are never reused, even after delete + re-create.
  CREATE TABLE date_overrides (
    date TEXT PRIMARY KEY CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
    is_open INTEGER NOT NULL CHECK (is_open IN (0, 1)),
    start_time TEXT CHECK (start_time IS NULL OR start_time GLOB '[0-2][0-9]:[03]0'),
    end_time TEXT CHECK (end_time IS NULL OR (end_time GLOB '[0-2][0-9]:[03]0' AND end_time <= '24:00')),
    note TEXT CHECK (note IS NULL OR length(note) <= 200),
    version INTEGER NOT NULL CHECK (version >= 1),
    updated_by TEXT REFERENCES users(id),
    updated_at INTEGER NOT NULL,
    CHECK ((is_open = 1 AND start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
        OR (is_open = 0 AND start_time IS NULL AND end_time IS NULL))
  ) STRICT;

  CREATE TABLE counters (name TEXT PRIMARY KEY, value INTEGER NOT NULL) STRICT;
  CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;

  CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(id),
    entity TEXT NOT NULL CHECK (entity IN ('appointment', 'weekly_schedule', 'date_override', 'backup')),
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'cancel', 'delete', 'download', 'restore')),
    before TEXT,
    after TEXT,
    at INTEGER NOT NULL
  ) STRICT;
  CREATE INDEX audit_log_entity_idx ON audit_log(entity, entity_id);

  -- The doctor's changes, for the secretary. payload snapshots the appointment at that moment.
  CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_id TEXT NOT NULL REFERENCES appointments(id),
    type TEXT NOT NULL CHECK (type IN ('created', 'updated', 'cancelled')),
    payload TEXT NOT NULL,
    read_at INTEGER,
    created_at INTEGER NOT NULL
  ) STRICT;
  CREATE INDEX notifications_unread_idx ON notifications(recipient_id, read_at, created_at);

  CREATE TABLE login_attempts (ip TEXT NOT NULL, at INTEGER NOT NULL) STRICT;
  CREATE INDEX login_attempts_idx ON login_attempts(ip, at);

  -- Backups of everything above (except sessions and login attempts), as JSON in 1 MB chunks
  -- (SQLite rows here are limited to 2 MB).
  CREATE TABLE backups (
    name TEXT PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('daily', 'pre-restore')),
    bytes INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  ) STRICT;
  CREATE TABLE backup_chunks (
    name TEXT NOT NULL REFERENCES backups(name) ON DELETE CASCADE,
    seq INTEGER NOT NULL,
    data TEXT NOT NULL,
    PRIMARY KEY (name, seq)
  ) STRICT;
  `,
];

/** Applies the migrations not yet applied. Runs inside the object's constructor, before any request. */
export function migrate(storage: DurableObjectStorage): void {
  const sql = storage.sql;
  sql.exec('CREATE TABLE IF NOT EXISTS _migrations (id INTEGER PRIMARY KEY, at INTEGER NOT NULL) STRICT');
  const done = new Set(sql.exec<{ id: number }>('SELECT id FROM _migrations').toArray().map((r) => r.id));
  MIGRATIONS.forEach((statements, i) => {
    const id = i + 1;
    if (done.has(id)) return;
    storage.transactionSync(() => {
      sql.exec(statements);
      sql.exec('INSERT INTO _migrations (id, at) VALUES (?, ?)', id, Date.now());
    });
  });
}
