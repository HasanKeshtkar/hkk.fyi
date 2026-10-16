// Small HTTP toolkit for the Durable Object: JSON responses, the same error shapes as the API has
// always returned, cookies, and the security headers every response carries.
import { ZodError } from 'zod';
import type { ApiError } from '../shared/api';

/** An expected outcome with a status and a body for the client. Messages never hold patient data. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiError,
  ) {
    super(body.error);
  }
}

// Same-origin only: nothing is loaded from any other host. Next's static export needs inline
// scripts (its page payload) and inline styles, hence 'unsafe-inline'; everything else is 'self'.
export const CSP = [
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

/** Adds the security headers (and no-store unless a cache policy is set) to a response. */
export function secure(res: Response, https: boolean): Response {
  const out = new Response(res.body, res);
  const h = out.headers;
  h.set('x-content-type-options', 'nosniff');
  h.set('referrer-policy', 'no-referrer');
  h.set('x-frame-options', 'DENY');
  h.set('permissions-policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  h.set('content-security-policy', CSP);
  if (https) h.set('strict-transport-security', 'max-age=31536000');
  if (!h.has('cache-control')) h.set('cache-control', 'no-store');
  return out;
}

export function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}

export function errorResponse(err: unknown): Response {
  if (err instanceof HttpError) return json(err.body, err.status);
  if (err instanceof ZodError) {
    const path = err.issues[0]?.path.join('.');
    return json({ error: 'validation', ...(path ? { field: path } : {}) } satisfies ApiError, 400);
  }
  // Only the error's class: messages can quote request bodies or SQL values (patient data).
  console.error(JSON.stringify({ msg: 'request failed', errName: (err as Error)?.name ?? typeof err }));
  return json({ error: 'server_error' } satisfies ApiError, 500);
}

const MAX_BODY_BYTES = 16 * 1024;

/**
 * The request body as JSON, or a 400 for anything that is not (nothing of it is echoed back).
 * At most 16 KB, and never more than that held in memory (a 413 for anything bigger).
 */
export async function readJson(request: Request): Promise<unknown> {
  if (!request.body) return {};
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await drain(reader);
      throw new HttpError(413, { error: 'bad_request' });
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    bytes.set(c, at);
    at += c.byteLength;
  }
  const text = new TextDecoder().decode(bytes);
  if (text === '') return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, { error: 'bad_request' });
  }
}

async function drain(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<void> {
  try {
    while (!(await reader.read()).done);
  } catch {
    // the client went away
  }
}

/** Reads a body to its end, keeping none of it. */
export async function discard(body: ReadableStream<Uint8Array>): Promise<void> {
  if (!body.locked) await drain(body.getReader());
}

export function getCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie');
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    if (part.slice(0, i).trim() === name) {
      try {
        return decodeURIComponent(part.slice(i + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

export function sessionCookie(name: string, secure: boolean, token: string, maxAgeSeconds: number): string {
  return [
    `${name}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    secure ? 'Secure' : '',
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
  ]
    .filter(Boolean)
    .join('; ');
}

interface Route<H> {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: H;
  public: boolean;
}

/** Method + path routing with `:params` (decoded once; a segment never matches '/'). */
export class Router<H> {
  private routes: Route<H>[] = [];

  add(method: string, path: string, handler: H, opts: { public?: boolean } = {}): void {
    const keys: string[] = [];
    const pattern = new RegExp(
      `^${path.replace(/:([a-zA-Z]+)/g, (_m, k: string) => {
        keys.push(k);
        return '([^/]+)';
      })}$`,
    );
    this.routes.push({ method, pattern, keys, handler, public: opts.public ?? false });
  }

  /** The route for this request with its decoded params, or null. */
  match(method: string, path: string): { route: Route<H>; params: Record<string, string> } | null {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const m = route.pattern.exec(path);
      if (!m) continue;
      const params: Record<string, string> = {};
      try {
        route.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1]!)));
      } catch {
        return null;
      }
      return { route, params };
    }
    return null;
  }
}
