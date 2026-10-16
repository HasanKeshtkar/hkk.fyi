// Starts the built app (out/) on the Workers runtime for the browser tests, with fresh data and
// the test-only routes (TEST_MODE). The two accounts come from the SEED_* settings below.
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 4310;
const state = path.join(os.tmpdir(), 'clinic-e2e-state');
rmSync(state, { recursive: true, force: true });

const vars = {
  APP_ORIGIN: `http://localhost:${PORT}`,
  TEST_MODE: '1',
  LOGIN_RATE_LIMIT_MAX: '100',
  SEED_DOCTOR_NAME: 'دکتر کشتکار',
  SEED_DOCTOR_PASSWORD: 'doctor-e2e-pass',
  SEED_SECRETARY_NAME: 'خانم منشی',
  SEED_SECRETARY_PASSWORD: 'secretary-e2e-pass',
};
const child = spawn(
  'npx',
  [
    'wrangler', 'dev',
    '--port', String(PORT),
    '--ip', '127.0.0.1',
    '--local-upstream', `localhost:${PORT}`,
    '--persist-to', state,
    '--show-interactive-dev-session=false',
    '--log-level', 'warn',
    ...Object.entries(vars).flatMap(([k, v]) => ['--var', `${k}:${v}`]),
  ],
  // Same process group as this script: when Playwright stops the server, wrangler stops too.
  { stdio: 'inherit', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } },
);
const stop = () => {
  child.kill('SIGTERM');
  process.exit(0);
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
child.on('exit', (code) => process.exit(code ?? 1));
