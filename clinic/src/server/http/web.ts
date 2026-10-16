import { readFileSync } from 'node:fs';
import path from 'node:path';
import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';
import type { Config } from '../config.js';

// Same-origin only: the app loads nothing from any other host. Next's static export needs inline
// scripts (its page payload) and inline styles, hence 'unsafe-inline'; everything else is 'self'.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

/** Headers for every response, API included. */
export function securityHeaders(app: FastifyInstance, config: Config): void {
  const https = config.origins[0]!.startsWith('https://');
  app.addHook('onSend', async (_req, reply, payload) => {
    reply.header('x-content-type-options', 'nosniff');
    reply.header('referrer-policy', 'no-referrer');
    reply.header('x-frame-options', 'DENY');
    reply.header('permissions-policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    reply.header('content-security-policy', CSP);
    if (https) reply.header('strict-transport-security', 'max-age=31536000');
    if (!reply.hasHeader('cache-control')) reply.header('cache-control', 'no-store');
    return payload;
  });
}

/**
 * Serves the static web app (next build → out/). Every route registered here is public:
 * the login page and the app shell must load before anyone is signed in. Data only ever comes
 * from /api, which stays behind the session check.
 */
export async function webRoutes(app: FastifyInstance, webRoot: string): Promise<void> {
  const notFoundPage = readFileSync(path.join(webRoot, '404.html'), 'utf8');

  await app.register(async (scope) => {
    scope.addHook('onRoute', (route) => {
      route.config = { ...(route.config as object), public: true };
    });
    await scope.register(fastifyStatic, {
      root: webRoot,
      prefix: '/',
      index: ['index.html'],
      redirect: true,
      cacheControl: false,
      etag: true,
      lastModified: true,
      setHeaders(res, filePath) {
        // Build output under _next/static is content-hashed: cache it for good.
        if (filePath.includes(`${path.sep}_next${path.sep}static${path.sep}`)) {
          res.header('cache-control', 'public, max-age=31536000, immutable');
        } else {
          // HTML and other unhashed files: always revalidate, so a deploy shows up at once.
          res.header('cache-control', 'no-cache');
        }
      },
    });
  });

  app.setNotFoundHandler((req, reply) => {
    if (req.method === 'GET' && !req.url.startsWith('/api/') && (req.headers.accept ?? '').includes('text/html')) {
      return reply.status(404).type('text/html; charset=utf-8').header('cache-control', 'no-cache').send(notFoundPage);
    }
    return reply.status(404).send({ error: 'not_found' });
  });
}
