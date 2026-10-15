import { buildApp } from './app.js';
import { purgeExpiredSessions } from './auth/sessions.js';
import { loadConfig } from './config.js';
import { createDb, createPool } from './db/client.js';
import { runMigrations } from './db/migrate.js';
import { loadDotEnv } from './env-file.js';

loadDotEnv();
const config = loadConfig(process.env);
const pool = createPool(config.databaseUrl, 10);
await runMigrations(pool);
const db = createDb(pool);
const app = await buildApp({ db, config });

const purge = () => purgeExpiredSessions(db).catch((err) => app.log.warn({ errName: (err as Error).name }, 'session purge failed'));
void purge();
setInterval(purge, 6 * 60 * 60 * 1000).unref();

let closing = false;
async function shutdown(signal: string) {
  if (closing) return;
  closing = true;
  app.log.info({ signal }, 'shutting down');
  try {
    await app.close();
    await pool.end();
  } finally {
    process.exit(0);
  }
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

await app.listen({ port: config.port, host: config.host });
