// Starts the app on the real Workers runtime (wrangler dev = workerd, the same runtime as on
// Cloudflare) once for the whole test run, with test-only routes enabled (TEST_MODE).
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { TestProject } from 'vitest/node';

export const TEST_PASSWORDS = { doctor: 'doctor-pass-123', secretary: 'secretary-pass-123' } as const;

declare module 'vitest' {
  export interface ProvidedContext {
    baseUrl: string;
  }
}

export async function startWorker(port: number, vars: Record<string, string>, persistTo: string): Promise<ChildProcess> {
  const args = [
    'wrangler', 'dev',
    '--port', String(port),
    '--ip', '127.0.0.1',
    '--local-upstream', `localhost:${port}`,
    '--persist-to', persistTo,
    '--test-scheduled',
    '--show-interactive-dev-session=false',
    '--log-level', 'warn',
    ...Object.entries(vars).flatMap(([k, v]) => ['--var', `${k}:${v}`]),
  ];
  // Its own process group, so stopWorker() ends wrangler and workerd too, not just npx.
  const child = spawn('npx', args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    detached: true,
  });
  let output = '';
  child.stdout!.on('data', (d) => (output += d));
  child.stderr!.on('data', (d) => (output += d));
  const deadline = Date.now() + 90_000;
  for (;;) {
    try {
      const res = await fetch(`http://localhost:${port}/healthz`);
      if (res.ok) return child;
    } catch {
      // not up yet
    }
    if (child.exitCode !== null || Date.now() > deadline) {
      await stopWorker(child);
      throw new Error(`wrangler dev did not start:\n${output.slice(-3000)}`);
    }
    await new Promise((r) => setTimeout(r, 300));
  }
}

/** Stops a worker started by startWorker and waits until its port is free. */
export async function stopWorker(child: ChildProcess, port?: number): Promise<void> {
  try {
    process.kill(-child.pid!, 'SIGTERM');
  } catch {
    // already gone
  }
  if (port === undefined) return;
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      await fetch(`http://localhost:${port}/healthz`);
    } catch {
      return;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
}

export function testVars(port: number): Record<string, string> {
  return {
    APP_ORIGIN: `http://localhost:${port}`,
    TEST_MODE: '1',
    SEED_DOCTOR_NAME: 'دکتر تست',
    SEED_DOCTOR_PASSWORD: TEST_PASSWORDS.doctor,
    SEED_SECRETARY_NAME: 'منشی تست',
    SEED_SECRETARY_PASSWORD: TEST_PASSWORDS.secretary,
  };
}

export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const port = 8790;
  const dir = mkdtempSync(path.join(os.tmpdir(), 'clinic-worker-test-'));
  const child = await startWorker(port, testVars(port), dir);
  project.provide('baseUrl', `http://localhost:${port}`);
  return async () => {
    await stopWorker(child, port);
    rmSync(dir, { recursive: true, force: true });
  };
}
