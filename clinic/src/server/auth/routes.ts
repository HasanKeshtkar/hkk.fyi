import { randomBytes } from 'node:crypto';
import { asc, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { LoginBody, type MeResponse, type UserDto } from '../../shared/api.js';
import type { Config } from '../config.js';
import type { Db } from '../db/client.js';
import { users } from '../db/schema.js';
import { userDto } from '../http/dto.js';
import { HttpError } from '../http/errors.js';
import { hashPassword, verifyPassword } from './password.js';
import { createSession, deleteSession } from './sessions.js';

export function setSessionCookie(reply: FastifyReply, config: Config, token: string, expiresAt: Date): void {
  void reply.setCookie(config.cookieName, token, {
    path: '/',
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    maxAge: Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
  });
}

async function allUsers(db: Db): Promise<UserDto[]> {
  const rows = await db.select().from(users).orderBy(asc(users.role));
  return rows.map(userDto);
}

export function authRoutes(app: FastifyInstance, { db, config }: { db: Db; config: Config }): void {
  // Verifying against a throwaway hash when the role has no user keeps the response time the same.
  let dummyHash: Promise<string> | undefined;
  const dummy = () => (dummyHash ??= hashPassword(randomBytes(16).toString('hex')));

  app.post(
    '/api/auth/login',
    {
      config: {
        public: true,
        rateLimit: { max: config.loginRateLimit.max, timeWindow: config.loginRateLimit.windowMs },
      },
    },
    async (req, reply): Promise<MeResponse> => {
      const body = LoginBody.parse(req.body);
      const [user] = await db.select().from(users).where(eq(users.role, body.role));
      const ok = await verifyPassword(user?.passwordHash ?? (await dummy()), body.password);
      if (!user || !ok) throw new HttpError(401, { error: 'invalid_credentials' });
      const { token, expiresAt } = await createSession(db, user.id);
      setSessionCookie(reply, config, token, expiresAt);
      return { user: userDto(user), users: await allUsers(db) };
    },
  );

  app.post('/api/auth/logout', { config: { public: true } }, async (req, reply) => {
    await deleteSession(db, req.cookies[config.cookieName]);
    void reply.clearCookie(config.cookieName, {
      path: '/',
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: 'lax',
    });
    return { ok: true };
  });

  app.get('/api/me', async (req): Promise<MeResponse> => ({ user: userDto(req.user!), users: await allUsers(db) }));
}
