import type { FastifyInstance } from 'fastify';
import type { BackupsResponse } from '../../shared/api.js';
import type { Config } from '../config.js';
import type { Db } from '../db/client.js';
import { auditLog } from '../db/schema.js';
import { HttpError } from '../http/errors.js';
import { DAILY_PREFIX, listBackups, openBackup } from './backup.js';

/** A daily backup older than this means the backups have stopped. */
const STALE_AFTER_MS = 36 * 60 * 60 * 1000;

/** Backup status for the settings screen, and download of the newest backup (for a copy off the server). */
export function backupRoutes(app: FastifyInstance, { db, config }: { db: Db; config: Config }): void {
  app.get('/api/backups', async (): Promise<BackupsResponse> => {
    if (!config.backup) return { enabled: false, latest: null, stale: false };
    const newest = (await listBackups(config.backup.dir)).find((b) => b.name.startsWith(DAILY_PREFIX)) ?? null;
    return {
      enabled: true,
      latest: newest && { name: newest.name, bytes: newest.bytes, at: newest.at.toISOString() },
      stale: !newest || Date.now() - newest.at.getTime() > STALE_AFTER_MS,
    };
  });

  // The file holds every patient's name and phone: each download is recorded.
  app.get<{ Params: { name: string } }>('/api/backups/:name', async (req, reply) => {
    const file = config.backup ? await openBackup(config.backup.dir, req.params.name) : null;
    if (!file) throw new HttpError(404, { error: 'not_found' });
    await db.insert(auditLog).values({
      userId: req.user!.id,
      entity: 'backup',
      entityId: req.params.name,
      action: 'download',
    });
    return reply
      .header('content-type', 'application/octet-stream')
      .header('content-disposition', `attachment; filename="${req.params.name}"`)
      .header('content-length', String(file.bytes))
      .send(file.stream);
  });
}
