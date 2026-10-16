// The two accounts come from the SEED_* settings: created on first start, and a changed password
// (a new deploy) replaces the old one and signs that person out everywhere, and only that person.
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ChildProcess } from 'node:child_process';
import { afterAll, describe, expect, it } from 'vitest';
import { startWorker, stopWorker, testVars } from '../worker-setup';

const PORT = 8795;
const BASE = `http://localhost:${PORT}`;
const dir = mkdtempSync(path.join(os.tmpdir(), 'clinic-accounts-test-'));
let running: ChildProcess | null = null;

afterAll(async () => {
  if (running) await stopWorker(running, PORT);
  rmSync(dir, { recursive: true, force: true });
});

async function start(vars: Record<string, string>) {
  if (running) await stopWorker(running, PORT);
  running = await startWorker(PORT, { ...testVars(PORT), ...vars }, dir);
}

async function login(role: string, password: string): Promise<{ status: number; cookie: string | null }> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { origin: BASE, 'content-type': 'application/json' },
    body: JSON.stringify({ role, password }),
  });
  return { status: res.status, cookie: res.headers.get('set-cookie')?.split(';')[0] ?? null };
}

const me = async (cookie: string) => (await fetch(`${BASE}/api/me`, { headers: { cookie } })).status;

describe('accounts from the settings', () => {
  it('first start creates them; a new password on a new deploy replaces the old one for that person only', async () => {
    await start({ SEED_DOCTOR_PASSWORD: 'doctor-pass-1', SEED_SECRETARY_PASSWORD: 'secretary-pass-1', DEPLOY_ID: 'a' });
    const doc = await login('doctor', 'doctor-pass-1');
    const sec = await login('secretary', 'secretary-pass-1');
    expect([doc.status, sec.status]).toEqual([200, 200]);

    await start({ SEED_DOCTOR_PASSWORD: 'doctor-pass-1', SEED_SECRETARY_PASSWORD: 'secretary-pass-2', SEED_SECRETARY_NAME: 'خانم رضایی', DEPLOY_ID: 'b' });
    expect(await me(sec.cookie!)).toBe(401); // signed out everywhere
    expect(await me(doc.cookie!)).toBe(200); // the doctor is untouched
    expect((await login('secretary', 'secretary-pass-1')).status).toBe(401);
    const again = await login('secretary', 'secretary-pass-2');
    expect(again.status).toBe(200);
    const body = (await (await fetch(`${BASE}/api/me`, { headers: { cookie: again.cookie! } })).json()) as { user: { name: string } };
    expect(body.user.name).toBe('خانم رضایی');
  });
});
