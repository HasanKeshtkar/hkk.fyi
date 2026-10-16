// Replaces the WHOLE database with a backup. On the server: `node dist/restore.mjs <file> --yes`.
// The current data is backed up first (pre-restore-*.dump in BACKUP_DIR). Restart the app after.
import path from 'node:path';
import { restoreBackup } from '../src/server/backup/backup.js';

const url = process.env.DATABASE_URL;
const file = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (!url || !file) {
  console.error('usage: DATABASE_URL=... node dist/restore.mjs <backup file> --yes');
  process.exit(1);
}
if (!process.argv.includes('--yes')) {
  console.error('This replaces ALL appointments, hours and users with the backup. Add --yes to go ahead.');
  process.exit(1);
}
const dir = path.resolve(process.env.BACKUP_DIR?.trim() || 'backups');
try {
  const { safetyBackup } = await restoreBackup({ databaseUrl: url, file: path.resolve(file), dir });
  console.log(`restored ${file}`);
  console.log(`the data from before the restore is in ${path.join(dir, safetyBackup.name)}`);
  console.log('Now restart the app so both phones reload everything.');
} catch (err) {
  console.error(`restore failed, nothing was changed: ${(err as Error).message}`);
  process.exit(1);
}
