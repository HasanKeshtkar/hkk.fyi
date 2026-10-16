// Realtime channel (socket.io on the same HTTP server and origin as the API).
//
// The server is the source of truth: after every committed change it tells every connected phone,
// and phones apply the change by version (see src/web/lib/day-store.ts). Anything missed while a
// phone was disconnected is recovered by its full re-read on reconnect, so nothing here is queued.
import type { FastifyInstance } from 'fastify';
import { Server, type Socket } from 'socket.io';
import type { AppointmentDto, NotificationDto, ServerEvents } from '../shared/api.js';
import { resolveSession } from './auth/sessions.js';
import type { Config } from './config.js';
import type { Db } from './db/client.js';
import type { User } from './db/schema.js';

export const SOCKET_PATH = '/socket.io';

interface SocketData {
  user: User;
  sessionId: string;
}

type AppSocket = Socket<Record<string, never>, ServerEvents, Record<string, never>, SocketData>;

export interface Realtime {
  appointmentChanged(appointment: AppointmentDto, action: 'create' | 'update' | 'cancel', by: string): void;
  scheduleChanged(by: string): void;
  notificationCreated(recipientId: string, n: NotificationDto): void;
  notificationsRead(userId: string, ids: string[]): void;
  /** Logs a session out of realtime too (logout). */
  disconnectSession(sessionId: string): void;
  close(): Promise<void>;
}

const userRoom = (id: string) => `user:${id}`;
const sessionRoom = (id: string) => `session:${id}`;
const SIGNED_IN = 'signed-in';

export function attachRealtime(app: FastifyInstance, { db, config }: { db: Db; config: Config }): Realtime {
  const io = new Server<Record<string, never>, ServerEvents, Record<string, never>, SocketData>(app.server, {
    path: SOCKET_PATH,
    serveClient: false,
    // Fast detection of a dead connection, so the status bar and the write lock react quickly.
    pingInterval: 10_000,
    pingTimeout: 5_000,
    maxHttpBufferSize: 1024, // clients never send data
    // Same check as the HTTP API's CSRF guard, on every engine.io request (handshake and polling).
    allowRequest: (req, callback) => {
      const origin = req.headers.origin;
      callback(null, typeof origin === 'string' && config.origins.includes(origin));
    },
  });

  // Same session check as the API: no valid session cookie, no socket.
  io.use((socket, next) => {
    const token = app.parseCookie(socket.handshake.headers.cookie ?? '')[config.cookieName];
    resolveSession(db, token).then(
      (session) => {
        if (!session) return next(new Error('unauthorized'));
        socket.data.user = session.user;
        socket.data.sessionId = session.id;
        next();
      },
      () => next(new Error('unavailable')),
    );
  });

  io.on('connection', (socket: AppSocket) => {
    void socket.join([SIGNED_IN, userRoom(socket.data.user.id), sessionRoom(socket.data.sessionId)]);
    // Clients only listen; any event they emit is ignored.
  });

  return {
    appointmentChanged(appointment, action, by) {
      io.to(SIGNED_IN).emit('appointment', { appointment, action, by });
    },
    scheduleChanged(by) {
      io.to(SIGNED_IN).emit('schedule', { by });
    },
    notificationCreated(recipientId, n) {
      io.to(userRoom(recipientId)).emit('notification', n);
    },
    notificationsRead(userId, ids) {
      if (ids.length > 0) io.to(userRoom(userId)).emit('notifications:read', { ids });
    },
    disconnectSession(sessionId) {
      io.in(sessionRoom(sessionId)).disconnectSockets(true);
    },
    close: () =>
      new Promise<void>((resolve) => {
        io.close(() => resolve());
      }),
  };
}
