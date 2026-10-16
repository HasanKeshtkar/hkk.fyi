import type { FastifyInstance } from 'fastify';
import { MarkReadBody, type NotificationsResponse } from '../../shared/api.js';
import type { Db } from '../db/client.js';
import type { Realtime } from '../realtime.js';
import { listUnread, markRead } from './service.js';

export function notificationRoutes(app: FastifyInstance, { db, realtime }: { db: Db; realtime: Realtime }): void {
  app.get('/api/notifications', async (req): Promise<NotificationsResponse> => listUnread(db, req.user!.id));

  app.post('/api/notifications/read', async (req) => {
    const body = MarkReadBody.parse(req.body);
    const ids = await markRead(db, req.user!.id, 'all' in body ? 'all' : body.ids);
    // The same person's other phone clears its badge too.
    realtime.notificationsRead(req.user!.id, ids);
    return { ids };
  });
}
