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
    const before = await sql('SELECT * FROM appointments ORDER BY id');

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
    expect(await sql('SELECT * FROM appointments ORDER BY id')).toEqual(before);
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
});
