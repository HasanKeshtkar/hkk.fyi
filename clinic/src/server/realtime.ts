// Realtime channel (socket.io on the same HTTP server and origin as the API).
//
// The server is the source of truth: after every committed change it tells every connected phone,
// and phones apply the change by version (see src/web/lib/day-store.ts). Anything missed while a
// phone was disconnected is recovered by its full re-read on reconnect, so nothing here is queued.
import type { FastifyInstance } from 'fastify';
import { Server, type Socket } from 'socket.io';
import type { AppointmentDto, NotificationDto, ServerEvents } from '../shared/api.js';
import { liveSessionIds, resolveSession } from './auth/sessions.js';
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

/** How often open sockets are checked against the sessions table. */
export const SESSION_CHECK_MS = 30_000;

export interface RealtimeDeps {
  db: Db;
  config: Config;
  sessionCheckMs?: number;
}

export function attachRealtime(app: FastifyInstance, { db, config, sessionCheckMs = SESSION_CHECK_MS }: RealtimeDeps): Realtime {
  const io = new Server<Record<string, never>, ServerEvents, Record<string, never>, SocketData>(app.server, {
    path: SOCKET_PATH,
    serveClient: false,
    // WebSocket only: Android Chrome always has it, and every request then carries an Origin.
    transports: ['websocket'],
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
    // No sliding here: the handshake cannot re-send the cookie, so only API calls extend a session.
    resolveSession(db, token, new Date(), { slide: false }).then(
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

  // A session can end without a logout request reaching this process: it expires, or its row is
  // deleted (a password reset signs that user out everywhere). Its sockets must stop hearing
  // patient data too, so open sockets are checked against the database regularly. A dropped
  // socket reconnects, fails the handshake and sends that phone to the login screen.
  let checking = false;
  const checkSessions = async () => {
    if (checking) return;
    checking = true;
    try {
      const ids = [...new Set([...io.of('/').sockets.values()].map((s) => s.data.sessionId))];
      const live = await liveSessionIds(db, ids);
      for (const id of ids) if (!live.has(id)) io.in(sessionRoom(id)).disconnectSockets(true);
    } catch (err) {
      app.log.warn({ errName: (err as Error).name }, 'realtime session check failed'); // next round retries
    } finally {
      checking = false;
    }
  };
  const sessionCheck = setInterval(() => void checkSessions(), sessionCheckMs);
  sessionCheck.unref();

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
    // Must run before the HTTP server waits for its connections to end (Fastify's preClose):
    // open websockets never end on their own. Phones see the connection drop and reconnect to
    // whichever instance is serving, then re-read everything.
    close: async () => {
      clearInterval(sessionCheck);
      await io.close();
    },
  };
}
