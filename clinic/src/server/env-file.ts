import { existsSync } from 'node:fs';

/** Loads ./.env into process.env when present. Variables already set in the environment win. */
export function loadDotEnv(path = '.env'): void {
  if (existsSync(path)) process.loadEnvFile(path);
}
