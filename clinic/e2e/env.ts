export const E2E_PORT = 4310;
export const E2E_ORIGIN = `http://localhost:${E2E_PORT}`;
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:5432/clinic_e2e_test';
export const E2E_PASSWORDS = { doctor: 'doctor-e2e-pass', secretary: 'secretary-e2e-pass' } as const;
export const E2E_NAMES = { doctor: 'دکتر کشتکار', secretary: 'خانم منشی' } as const;
export const E2E_BACKUP_DIR = process.env.E2E_BACKUP_DIR ?? '/tmp/clinic-e2e-backups';
