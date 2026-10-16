// The backup status and download: signed-in users only, only real backup files, every download recorded.
import { mkdtemp, utimes, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runBackup } from '../../src/server/backup/backup.js';
import { TEST_DATABASE_URL } from '../helpers/env.js';
import { openTestDb, resetData } from '../helpers/db.js';
import { call, login, makeApp, setRealPasswords } from '../helpers/app.js';

const { pool, db } = openTestDb(10);
let app: FastifyInstance;
let dir: string;
let cookie: string;

beforeEach(async () => {
  await resetData(pool, db);
  await setRealPasswords(pool);
  dir = await mkdtemp(path.join(os.tmpdir(), 'clinic-backups-api-'));
  ({ app } = await makeApp(db, { backup: { dir, keep: 30, hour: 3 } }));
  cookie = await login(app, 'secretary');
});
afterEach(async () => {
  await app.close();
});
afterAll(async () => {
  await pool.end();
});

describe('backups API', () => {
  it('needs a session', async () => {
    expect((await call(app, null, 'GET', '/api/backups')).statusCode).toBe(401);
    expect((await call(app, null, 'GET', '/api/backups/clinic-2026-10-16_0300.dump')).statusCode).toBe(401);
  });

  it('says when there is no recent backup, then shows the newest one', async () => {
    expect((await call(app, cookie, 'GET', '/api/backups')).json()).toEqual({ enabled: true, latest: null, stale: true });

    const old = await runBackup({ databaseUrl: TEST_DATABASE_URL, dir, keep: 30, now: new Date('2026-10-10T00:00:00Z') });
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 3600 * 1000);
    await utimes(path.join(dir, old.name), twoDaysAgo, twoDaysAgo);
    expect((await call(app, cookie, 'GET', '/api/backups')).json()).toMatchObject({ latest: { name: old.name }, stale: true });

    const fresh = await runBackup({ databaseUrl: TEST_DATABASE_URL, dir, keep: 30 });
    const res = (await call(app, cookie, 'GET', '/api/backups')).json();
    expect(res).toMatchObject({ enabled: true, stale: false, latest: { name: fresh.name, bytes: fresh.bytes } });
  });

  it('downloads a backup and records who did', async () => {
    const b = await runBackup({ databaseUrl: TEST_DATABASE_URL, dir, keep: 30 });
    const res = await call(app, cookie, 'GET', `/api/backups/${b.name}`);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-disposition']).toBe(`attachment; filename="${b.name}"`);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.rawPayload.subarray(0, 5).toString()).toBe('PGDMP'); // a pg_dump custom-format file
    expect(res.rawPayload.length).toBe(b.bytes);

    const audit = await pool.query("select entity, entity_id, action, user_id from audit_log where entity = 'backup'");
    expect(audit.rows).toEqual([
      expect.objectContaining({ entity: 'backup', entity_id: b.name, action: 'download', user_id: expect.any(String) }),
    ]);
  });

  it('serves nothing but backup files from the backup folder', async () => {
    await writeFile(path.join(dir, 'secret.txt'), 'x');
    await writeFile(path.join(os.tmpdir(), 'clinic-2026-01-01_0300.dump'), 'outside');
    for (const name of ['secret.txt', '..%2Fclinic-2026-01-01_0300.dump', '%2E%2E%2Fsecret.txt', 'clinic-2026-10-16_0300.dump']) {
      expect((await call(app, cookie, 'GET', `/api/backups/${name}`)).statusCode).toBe(404);
    }
    expect((await pool.query("select 1 from audit_log where entity = 'backup'")).rowCount).toBe(0);
  });

  it('reports backups as off when the server has none configured', async () => {
    await app.close();
    ({ app } = await makeApp(db));
    cookie = await login(app, 'doctor');
    expect((await call(app, cookie, 'GET', '/api/backups')).json()).toEqual({ enabled: false, latest: null, stale: false });
  });
});
