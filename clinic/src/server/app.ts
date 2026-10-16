import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyServerOptions } from 'fastify';
import { sql } from 'drizzle-orm';
import { appointmentRoutes } from './appointments/routes.js';
import { authRoutes, setSessionCookie } from './auth/routes.js';
import { resolveSession } from './auth/sessions.js';
import type { Config } from './config.js';
import type { Db } from './db/client.js';
import type { User } from './db/schema.js';
import { errorHandler, HttpError } from './http/errors.js';
import { securityHeaders, webRoutes } from './http/web.js';
import { notificationRoutes } from './notifications/routes.js';
import { attachRealtime, type Realtime } from './realtime.js';
import { scheduleRoutes } from './schedule/routes.js';

declare module 'fastify' {
  interface FastifyContextConfig {
    /** reachable without a session (login, logout, health) */
    public?: boolean;
  }
  interface FastifyRequest {
    user: User | null;
  }
}

export interface AppDeps {
  db: Db;
  config: Config;
  /** Override the logger (tests capture output through a stream). */
  logger?: FastifyServerOptions['logger'];
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Request logs: method, path, status, timing. No headers (cookies), no bodies, no error messages. */
export function loggerOptions(level: string): Exclude<FastifyServerOptions['logger'], boolean | undefined> {
  return {
    level,
    serializers: {
      req: (req: { method: string; url: string; ip?: string }) => ({ method: req.method, url: req.url, ip: req.ip }),
      res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      // Never the message or stack: they can quote request bodies or query parameters.
      err: ((err: { name?: string; code?: string }) => ({ type: err.name, code: err.code })) as never,
    },
  };
}

export async function buildApp({ db, config, logger }: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    logger: logger ?? loggerOptions(config.logLevel),
    // Trust exactly N proxy hops (Liara's router), so request.ip is the phone, not a spoofable header value.
    trustProxy: (_address: string, hop: number) => hop < config.trustProxyHops,
    bodyLimit: 16 * 1024,
    // Malformed URLs and similar router-level failures: same JSON shape as every other error,
    // without echoing the URL back.
    frameworkErrors: (err, _req, reply) => {
      const status = err.statusCode && err.statusCode < 500 ? err.statusCode : 400;
      void (reply as FastifyReply).status(status).send({ error: 'bad_request' });
    },
  });

  await app.register(cookie);
  await app.register(rateLimit, { global: false });
  app.setErrorHandler(errorHandler);
  app.decorateRequest('user', null);
  securityHeaders(app, config);

  // Both guards decide from the matched route, never from the raw URL: the router decodes
  // percent-escapes and absolute-form targets, so '/%61pi/day' still runs the /api/day handler.

  // CSRF: every state-changing request, whatever its path, must come from one of our own origins.
  // Browsers always send Origin on cross-site and on same-origin non-GET fetches; a missing Origin is refused.
  app.addHook('onRequest', async (req) => {
    if (SAFE_METHODS.has(req.method)) return;
    const origin = req.headers.origin;
    if (!origin || !config.origins.includes(origin)) throw new HttpError(403, { error: 'forbidden' });
  });

  // Auth: deny by default. Only routes marked `config: { public: true }` run without a session.
  app.addHook('preHandler', async (req, reply) => {
    if (req.routeOptions.config?.public || req.is404) return;
    const token = req.cookies[config.cookieName];
    const session = await resolveSession(db, token);
    if (!session) throw new HttpError(401, { error: 'unauthorized' });
    req.user = session.user;
    if (session.refreshed && token) setSessionCookie(reply, config, token, session.expiresAt);
  });

  const realtime: Realtime = attachRealtime(app, { db, config });
  app.addHook('onClose', () => realtime.close());

  app.get('/healthz', { config: { public: true } }, async () => {
    await db.execute(sql`select 1`);
    return { ok: true };
  });

  authRoutes(app, { db, config, realtime });
  appointmentRoutes(app, { db, realtime });
  scheduleRoutes(app, { db, realtime });
  notificationRoutes(app, { db, realtime });
  if (config.webRoot) await webRoutes(app, config.webRoot);
  else app.setNotFoundHandler((_req, reply) => reply.status(404).send({ error: 'not_found' }));
  return app;
}
