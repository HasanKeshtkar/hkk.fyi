import { createPool } from '../src/server/db/client.js';
import { runMigrations } from '../src/server/db/migrate.js';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}
const pool = createPool(url, 1);
try {
  await runMigrations(pool);
  console.log('migrations applied');
} finally {
  await pool.end();
}
