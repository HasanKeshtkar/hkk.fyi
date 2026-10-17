// Backups: taken daily (once a day even if the trigger fires twice), downloadable (recorded), and
// a restore brings back exactly what was backed up after saving the current data.
import { beforeEach, describe, expect, it } from 'vitest';
import { BASE, book, call, live, login, reset, sql } from '../helpers/worker';

let doc: string;
let sec: string;

beforeEach(async () => {
  await reset();
  doc = await login('doctor');
  sec = await login('secretary');
});

const backupNow = async () => (await call(null, 'POST', '/api/test/backup', {})).body.name as string;
const day = async () =>
  (await call(sec, 'GET', '/api/day?date=2026-10-17')).body.appointments.map((a: { patientName: string; status: string }) => a.patientName);

describe('backups', () => {
  it('the daily trigger writes one backup a day; status says when, and warns when there is none', async () => {
    expect((await call(sec, 'GET', '/api/backups')).body).toEqual({ enabled: true, latest: null, stale: true, items: [] });
    await fetch(`${BASE}/__scheduled?cron=30+23+*+*+*`);
    await fetch(`${BASE}/__scheduled?cron=30+23+*+*+*`); // fired twice: still one backup
    const status = (await call(sec, 'GET', '/api/backups')).body;
    expect(status.items).toHaveLength(1);
    expect(status).toMatchObject({ stale: false, latest: { name: expect.stringMatching(/^clinic-\d{4}-\d{2}-\d{2}_\d{4}\.json$/) } });
  });

  it('download: the whole data as JSON, recorded in the audit log; nothing else can be fetched', async () => {
    await book(doc, '14:00');
    const name = await backupNow();
    const res = await call(sec, 'GET', `/api/backups/${name}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toBe(`attachment; filename="${name}"`);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.body).toMatchObject({ format: 'clinic-backup', version: 1 });
    expect(res.body.tables.appointments).toHaveLength(1);
    expect(res.body.tables).not.toHaveProperty('sessions');
    // The accounts are there by name only: no password hashes in a file that leaves the server.
    expect(res.body.tables.users.map((u: { role: string }) => u.role).sort()).toEqual(['doctor', 'secretary']);
    expect(JSON.stringify(res.body)).not.toContain('pbkdf2');
    expect(res.body.tables.users[0]).not.toHaveProperty('password_hash');
    expect(await sql("SELECT entity_id, action FROM audit_log WHERE entity = 'backup'")).toEqual([{ entity_id: name, action: 'download' }]);
    for (const bad of ['secret.txt', '..%2Fx.json', 'clinic-2026-01-01_0300.json']) {
      expect((await call(sec, 'GET', `/api/backups/${bad}`)).status).toBe(404);
    }
    expect((await call(null, 'GET', `/api/backups/${name}`)).status).toBe(401);
  });

  it('restore brings back exactly what was backed up, keeps a copy of what it replaced, and tells every phone', async () => {
    const kept = (await book(doc, '14:00', 'می‌ماند')).body;
    await call(doc, 'PUT', '/api/schedule/overrides/2026-10-18', { isOpen: false, note: 'تعطیل', version: null });
    const name = await backupNow();
    const before = await sql<{ version: number }>('SELECT * FROM appointments ORDER BY id');

    await call(doc, 'POST', `/api/appointments/${kept.id}/cancel`, { version: 1 });
    await book(doc, '15:00', 'بعد از پشتیبان');
    await call(doc, 'PUT', '/api/schedule/weekly/6', { isOpen: false, startTime: '14:00', endTime: '19:00', version: 1 });
    const closed = (await call(sec, 'GET', '/api/schedule')).body.overrides[0];
    await call(doc, 'PUT', '/api/schedule/overrides/2026-10-18', { isOpen: true, startTime: '10:00', endTime: '12:00', version: closed.version });
    expect(await day()).toEqual(['بعد از پشتیبان']);
    const phone = live(sec);
    await phone.opened;

    const res = await call(sec, 'POST', `/api/backups/${name}/restore`, {});
    expect(res.status).toBe(200);
    expect(res.body.safetyBackup).toMatch(/^pre-restore-/);
    await phone.next(1, 'restored');
    // Exactly what was backed up, except for newer version numbers (see the next test).
    const after = await sql<{ version: number }>('SELECT * FROM appointments ORDER BY id');
    expect(after.map(({ version: _, ...a }) => a)).toEqual(before.map(({ version: _, ...a }) => a));
    expect(after.every((a, i) => a.version > before[i]!.version)).toBe(true);
    expect(await day()).toEqual(['می‌ماند']);
    const schedule = (await call(sec, 'GET', '/api/schedule')).body;
    expect(schedule.weekly.find((w: { weekday: number }) => w.weekday === 6).isOpen).toBe(true);
    expect(schedule.overrides).toEqual([expect.objectContaining({ date: '2026-10-18', isOpen: false })]);
    // Sessions and accounts are untouched; the restore is in the audit log.
    expect((await call(doc, 'GET', '/api/me')).status).toBe(200);
    expect(await sql("SELECT action FROM audit_log WHERE entity = 'backup'")).toEqual([{ action: 'restore' }]);
    // Override versions keep increasing after a restore (a phone holding a newer one cannot match).
    const next = (await call(doc, 'PUT', '/api/schedule/overrides/2026-10-19', { isOpen: false, version: null })).body;
    expect(next.version).toBeGreaterThan(2);

    // And the data that was replaced can be brought back.
    await call(sec, 'POST', `/api/backups/${res.body.safetyBackup}/restore`, {});
    expect((await sql("SELECT patient_name FROM appointments WHERE status = 'scheduled'")).map((r) => r.patient_name)).toEqual(['بعد از پشتیبان']);
    phone.ws.close();
  });

  it('after a restore, a phone still holding a version from before it gets a conflict, not an overwrite', async () => {
    const a = (await book(doc, '14:00', 'علی')).body;
    const name = await backupNow();
    // After the backup: the secretary edits twice (v3) and changes Saturday (v2).
    await call(sec, 'PATCH', `/api/appointments/${a.id}`, { version: 1, patientPhone: '09120000002' });
    await call(sec, 'PATCH', `/api/appointments/${a.id}`, { version: 2, patientName: 'علی رضایی' });
    await call(sec, 'PUT', '/api/schedule/weekly/6', { isOpen: true, startTime: '15:00', endTime: '19:00', version: 1 });

    await call(doc, 'POST', `/api/backups/${name}/restore`, {});
    const restored = (await call(doc, 'GET', '/api/day?date=2026-10-17')).body.appointments[0];
    expect(restored).toMatchObject({ patientName: 'علی' });
    expect(restored.version).toBeGreaterThan(3); // newer than anything a phone has seen
    // Two edits by the doctor after the restore; then the secretary's sheet, still at v3, saves.
    await call(doc, 'PATCH', `/api/appointments/${a.id}`, { version: restored.version, patientName: 'علی محمدی' });
    const stale = await call(sec, 'PATCH', `/api/appointments/${a.id}`, { version: 3, patientName: 'علی رضایی' });
    expect(stale.status).toBe(409);
    expect(stale.body).toMatchObject({ error: 'version_conflict', current: { patientName: 'علی محمدی' } });
    // The same for working hours.
    const sat = (await call(doc, 'GET', '/api/schedule')).body.weekly.find((w: { weekday: number }) => w.weekday === 6);
    expect(sat).toMatchObject({ startTime: '14:00' });
    expect(sat.version).toBeGreaterThan(2);
    expect((await call(sec, 'PUT', '/api/schedule/weekly/6', { isOpen: false, startTime: '15:00', endTime: '19:00', version: 2 })).status).toBe(409);
  });

  it('versions stay above all ever handed out, even after restoring a backup with no appointments', async () => {
    const empty = await backupNow();
    const a = (await book(doc, '14:00', 'علی')).body;
    const name = await backupNow();
    await call(sec, 'PATCH', `/api/appointments/${a.id}`, { version: 1, patientPhone: '09120000002' });
    await call(sec, 'PATCH', `/api/appointments/${a.id}`, { version: 2, patientName: 'علی رضایی' }); // v3 on her phone
    await call(doc, 'POST', `/api/backups/${empty}/restore`, {});
    await call(doc, 'POST', `/api/backups/${name}/restore`, {});
    const restored = (await call(doc, 'GET', '/api/day?date=2026-10-17')).body.appointments[0];
    expect(restored.version).toBeGreaterThan(3);
    expect((await call(sec, 'PATCH', `/api/appointments/${a.id}`, { version: 3, patientName: 'علی رضایی' })).status).toBe(409);
  });

  it('a backup written before hashes were left out is downloaded without them', async () => {
    const old = JSON.stringify({
      format: 'clinic-backup',
      version: 1,
      createdAt: '2026-10-16T23:30:00.000Z',
      tables: { users: [{ id: 'u1', role: 'doctor', name: 'دکتر', password_hash: 'pbkdf2-sha256$100000$a$b', created_at: 0 }], appointments: [] },
    });
    await sql("INSERT INTO backups (name, kind, bytes, created_at) VALUES ('clinic-2026-10-17_0300.json', 'daily', ?, 0)", old.length);
    await sql("INSERT INTO backup_chunks (name, seq, data) VALUES ('clinic-2026-10-17_0300.json', 0, ?)", old);
    const file = (await call(sec, 'GET', '/api/backups/clinic-2026-10-17_0300.json')).body;
    expect(file.tables.users).toEqual([{ id: 'u1', role: 'doctor', name: 'دکتر', created_at: 0 }]);
    expect(JSON.stringify(file)).not.toContain('pbkdf2');
  });

  it('restoring an unknown backup changes nothing', async () => {
    await book(doc, '14:00');
    expect((await call(sec, 'POST', '/api/backups/clinic-2026-01-01_0300.json/restore', {})).status).toBe(404);
    expect(await day()).toEqual(['مریم احمدی']);
  });

  it('a large backup is stored in chunks and comes back whole', async () => {
    // Pad the audit log so the backup passes one chunk (500 000 characters).
    await sql(
      "WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 3000) INSERT INTO audit_log (user_id, entity, entity_id, action, before, after, at) SELECT NULL, 'appointment', 'x', 'update', ?, ?, 0 FROM n",
      JSON.stringify({ pad: 'x'.repeat(100) }),
      JSON.stringify({ pad: 'y'.repeat(100) }),
    );
    const name = await backupNow();
    const chunks = await sql<{ n: number }>('SELECT count(*) AS n FROM backup_chunks WHERE name = ?', name);
    expect(chunks[0]!.n).toBeGreaterThan(1);
    const res = await call(sec, 'GET', `/api/backups/${name}`);
    expect(res.body.tables.audit_log.length).toBe(3000);
  });

  it('a chunk never ends in the middle of an emoji (it would come back as garbage)', async () => {
    // 600 000 characters of emoji (each two UTF-16 units), so a chunk boundary falls inside them;
    // with 0 or 1 characters in front, one of the two runs puts it between the two halves.
    const emoji = '😀'.repeat(300_000);
    for (const lead of ['', 'x']) {
      await reset();
      await sql("INSERT INTO audit_log (user_id, entity, entity_id, action, before, after, at) VALUES (NULL, 'appointment', 'lead', 'update', ?, NULL, 0)", lead);
      await sql(
        "INSERT INTO audit_log (user_id, entity, entity_id, action, before, after, at) VALUES (NULL, 'appointment', 'emoji', 'update', replace(hex(zeroblob(300000)), '00', '😀'), NULL, 0)",
      );
      const name = await backupNow();
      const file = (await call(await login('doctor'), 'GET', `/api/backups/${name}`)).body;
      expect(file.tables.audit_log.find((r: { entity_id: string }) => r.entity_id === 'emoji').before === emoji).toBe(true);
    }
  });
});
