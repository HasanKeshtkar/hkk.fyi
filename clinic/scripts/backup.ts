// A backup now, into BACKUP_DIR (default ./backups). On the server: `node dist/backup.mjs`.
import path from 'node:path';
import { runBackup } from '../src/server/backup/backup.js';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}
const dir = path.resolve(process.env.BACKUP_DIR?.trim() || 'backups');
const keep = Number(process.env.BACKUP_KEEP ?? 30) || 30;
try {
  const b = await runBackup({ databaseUrl: url, dir, keep });
  console.log(`backup written: ${path.join(dir, b.name)} (${b.bytes} bytes)`);
} catch (err) {
  console.error(`backup failed: ${(err as Error).message}`);
  process.exit(1);
}
