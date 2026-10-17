// The clinic: one Durable Object holds all of its data (SQLite) and serves the whole API and the
// live channel. It handles one request at a time between awaits, and every write runs in a
// synchronous transaction, so the server is the single, consistent source of truth.
import { DurableObject } from 'cloudflare:workers';
import {
  CancelAppointmentBody,
  CreateAppointmentBody,
  DayQuery,
  DeleteOverrideQuery,
  IdParams,
  LoginBody,
  MarkReadBody,
  OverrideBody,
  OverrideParams,
  UpdateAppointmentBody,
  WeeklyDayBody,
  WeeklyDayParams,
  type BackupsResponse,
  type DayResponse,
  type MeResponse,
  type UserDto,
} from '../shared/api';
import { checkSlotAgainstHours, slotStarts } from '../shared/schedule';
import { addDays, clinicToday, instantAt } from '../shared/time';
import {
  appointmentDto,
  cancelAppointment,
  createAppointment,
  listActiveBetween,
  updateAppointment,
  type AppointmentRow,
  type WriteResult,
} from './appointments';
import {
  addressKey,
  hashPassword,
  hashToken,
  isTokenFormat,
  newToken,
  PASSWORD_MIN_LENGTH,
  SESSION_REFRESH_MS,
  SESSION_TTL_MS,
  verifyPassword,
} from './auth';
import { backupForDownload, listBackups, restoreBackup, writeBackup } from './backups';
import { migrate } from './db/schema';
import { all, one } from './db/sql';
import { originsOf, type Env, type Origins } from './env';
import { discard, errorResponse, getCookie, HttpError, json, readJson, Router, secure, sessionCookie } from './http';
import { listUnread, markRead } from './notifications';
import { deleteOverride, getDaySchedule, getWeekly, listOverrides, setWeeklyDay, upsertOverride } from './schedule';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
/** A phone stays trusted this long after it was last used (400 days: the longest a browser keeps a cookie). */
const DEVICE_TTL_MS = 400 * 24 * 60 * 60 * 1000;
const STALE_BACKUP_MS = 36 * 60 * 60 * 1000;
const DAILY_BACKUP_MIN_GAP_MS = 20 * 60 * 60 * 1000;
const DEFAULT_WEEKLY = [
  [6, 1, '14:00', '19:00'],
  [0, 1, '14:00', '19:00'],
  [1, 1, '08:00', '12:00'],
  [2, 1, '14:00', '19:00'],
  [3, 1, '14:00', '19:00'],
  [4, 0, '14:00', '19:00'],
  [5, 0, '14:00', '19:00'],
] as const;

type UserRow = { id: string; role: 'doctor' | 'secretary'; name: string; password_hash: string };

interface Session {
  id: string;
  user: UserDto;
  createdAt: number;
  /** set when the expiry was just extended: the cookie must be re-sent */
  refresh: { token: string; expiresAt: number } | null;
}

interface SocketInfo {
  sessionId: string;
  userId: string;
}

type Handler = (req: Request, params: Record<string, string>, session: Session | null) => Promise<Response> | Response;

export class Clinic extends DurableObject<Env> {
  private readonly sql: SqlStorage;
  private readonly origins: Origins;
  private readonly router = new Router<Handler>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.origins = originsOf(env);
    // A live phone's keep-alive is answered without waking the object (and without billing).
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    void ctx.blockConcurrencyWhile(async () => {
      migrate(ctx.storage);
      await this.ensureInitialData();
    });
    this.routes();
  }

  // ---------------------------------------------------------------- setup

  /**
   * Creates what a new database lacks (default hours, the two accounts from SEED_* settings).
   * The SEED_* settings stay the source of the names and passwords: a changed password (after a
   * new deploy) replaces the old one and signs that person out everywhere.
   */
  private async ensureInitialData(): Promise<void> {
    const now = Date.now();
    for (const [weekday, open, start, end] of DEFAULT_WEEKLY) {
      this.sql.exec(
        'INSERT INTO weekly_schedule (weekday, is_open, start_time, end_time, version, updated_by, updated_at) VALUES (?, ?, ?, ?, 1, NULL, ?) ON CONFLICT(weekday) DO NOTHING',
        weekday,
        open,
        start,
        end,
        now,
      );
    }
    // Sessions older than this were signed in before trusted phones existed (see GET /api/me).
    this.sql.exec("INSERT INTO meta (key, value) VALUES ('trusted_devices_since', ?) ON CONFLICT(key) DO NOTHING", String(now));
    // Passwords are compared once per deploy (hashing is deliberately slow), or always when no
    // deploy id is set (local runs).
    const deployId = this.env.DEPLOY_ID ?? '';
    const checked = one<{ value: string }>(this.sql, "SELECT value FROM meta WHERE key = 'passwords_checked_for'")?.value;
    const checkPasswords = deployId === '' || checked !== deployId;
    const accounts = [
      { role: 'doctor', name: this.env.SEED_DOCTOR_NAME, password: this.env.SEED_DOCTOR_PASSWORD, fallback: 'دکتر' },
      { role: 'secretary', name: this.env.SEED_SECRETARY_NAME, password: this.env.SEED_SECRETARY_PASSWORD, fallback: 'منشی' },
    ] as const;
    for (const a of accounts) {
      const password = a.password ?? '';
      const name = a.name?.trim() || a.fallback;
      const existing = one<UserRow>(this.sql, 'SELECT * FROM users WHERE role = ?', a.role);
      if (!existing) {
        if (password.length < PASSWORD_MIN_LENGTH) {
          console.warn(JSON.stringify({ msg: `no ${a.role} account: SEED_${a.role.toUpperCase()}_PASSWORD missing or shorter than ${PASSWORD_MIN_LENGTH}` }));
          continue;
        }
        this.sql.exec(
          'INSERT INTO users (id, role, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
          crypto.randomUUID(),
          a.role,
          name,
          await hashPassword(password),
          now,
        );
        continue;
      }
      if (existing.name !== name) this.sql.exec('UPDATE users SET name = ? WHERE id = ?', name, existing.id);
      if (checkPasswords && password !== '' && password.length < PASSWORD_MIN_LENGTH) {
        // CI refuses such a password before deploying; this is for anything that slips past it.
        console.error(JSON.stringify({ msg: `${a.role} password NOT changed: shorter than ${PASSWORD_MIN_LENGTH}` }));
      }
      if (checkPasswords && password.length >= PASSWORD_MIN_LENGTH && !(await verifyPassword(existing.password_hash, password))) {
        const hash = await hashPassword(password);
        this.ctx.storage.transactionSync(() => {
          this.sql.exec('UPDATE users SET password_hash = ? WHERE id = ?', hash, existing.id);
          this.sql.exec('DELETE FROM sessions WHERE user_id = ?', existing.id);
          this.sql.exec('DELETE FROM trusted_devices WHERE user_id = ?', existing.id);
        });
      }
    }
    if (deployId !== '') {
      this.sql.exec(
        "INSERT INTO meta (key, value) VALUES ('passwords_checked_for', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        deployId,
      );
    }
  }

  // ---------------------------------------------------------------- requests

  override async fetch(request: Request): Promise<Response> {
    const res = await this.handle(request);
    // A request turned away before its body was read: read it to the end anyway (discarding it),
    // or the runtime reports an error for the unread stream once the answer has gone out.
    if (request.body && !request.bodyUsed) await discard(request.body);
    return res;
  }

  private async handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/live') return await this.openLive(request);
      const match = this.router.match(request.method, url.pathname);
      if (!match) throw new HttpError(404, { error: 'not_found' });
      // CSRF: every state-changing request must come from one of our own pages.
      if (!SAFE_METHODS.has(request.method)) {
        const origin = request.headers.get('origin');
        if (!origin || !this.origins.list.includes(origin)) throw new HttpError(403, { error: 'forbidden' });
      }
      // Deny by default: only routes marked public run without a session.
      const session = await this.resolveSession(request, true);
      if (!match.route.public && !session) throw new HttpError(401, { error: 'unauthorized' });
      const res = await match.route.handler(request, match.params, session);
      if (session?.refresh) {
        const out = new Response(res.body, res);
        out.headers.append('set-cookie', this.cookie(session.refresh.token, session.refresh.expiresAt));
        return secure(out, this.origins.https);
      }
      return secure(res, this.origins.https);
    } catch (err) {
      return secure(errorResponse(err), this.origins.https);
    }
  }

  private on(method: string, path: string, handler: Handler, opts: { public?: boolean } = {}): void {
    this.router.add(method, path, handler, opts);
  }

  private cookie(token: string, expiresAt: number): string {
    return sessionCookie(this.origins.cookieName, this.origins.cookieSecure, token, (expiresAt - Date.now()) / 1000);
  }

  private users(): UserDto[] {
    return all<UserRow>(this.sql, 'SELECT id, role, name FROM users ORDER BY role').map((u) => ({ id: u.id, name: u.name, role: u.role }));
  }

  /** One trusted-device cookie per account, so signing in to the other account on the same phone keeps both. */
  private deviceCookieName(role: string): string {
    return `${this.origins.deviceCookieName}-${role}`;
  }

  /** This phone's trusted-device record for the account, or null. */
  private async trustedDevice(request: Request, role: string): Promise<{ id: string; token: string } | null> {
    const token = getCookie(request, this.deviceCookieName(role));
    if (!isTokenFormat(token)) return null;
    const row = one<{ id: string }>(
      this.sql,
      'SELECT d.id FROM trusted_devices d JOIN users u ON u.id = d.user_id WHERE d.id = ? AND u.role = ? AND d.last_used_at > ?',
      await hashToken(token),
      role,
      Date.now() - DEVICE_TTL_MS,
    );
    return row ? { id: row.id, token } : null;
  }

  /** Marks this phone as trusted for the account, or keeps it so; returns the cookie (with a fresh lifetime). */
  private async trustDevice(request: Request, user: { id: string; role: string }): Promise<string> {
    const known = await this.trustedDevice(request, user.role);
    const now = Date.now();
    let token: string;
    if (known) {
      this.sql.exec('UPDATE trusted_devices SET last_used_at = ? WHERE id = ?', now, known.id);
      token = known.token;
    } else {
      token = newToken();
      const id = await hashToken(token);
      this.sql.exec('DELETE FROM trusted_devices WHERE last_used_at < ?', now - DEVICE_TTL_MS);
      this.sql.exec('INSERT INTO trusted_devices (id, user_id, created_at, last_used_at) VALUES (?, ?, ?, ?)', id, user.id, now, now);
    }
    return sessionCookie(this.deviceCookieName(user.role), this.origins.cookieSecure, token, DEVICE_TTL_MS / 1000);
  }

  /** The session behind the request's cookie, or null. `slide` extends a session in daily use. */
  private async resolveSession(request: Request, slide: boolean): Promise<Session | null> {
    const token = getCookie(request, this.origins.cookieName);
    if (!isTokenFormat(token)) return null;
    const id = await hashToken(token);
    const now = Date.now();
    const row = one<{ id: string; created_at: number; last_seen_at: number; uid: string; name: string; role: 'doctor' | 'secretary' }>(
      this.sql,
      'SELECT s.id, s.created_at, s.last_seen_at, u.id AS uid, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.expires_at > ?',
      id,
      now,
    );
    if (!row) return null;
    let refresh: Session['refresh'] = null;
    if (slide && now - row.last_seen_at >= SESSION_REFRESH_MS) {
      const expiresAt = now + SESSION_TTL_MS;
      this.sql.exec('UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE id = ?', now, expiresAt, id);
      refresh = { token, expiresAt };
    }
    return { id, user: { id: row.uid, name: row.name, role: row.role }, createdAt: row.created_at, refresh };
  }

  private routes(): void {
    this.on('GET', '/healthz', () => {
      this.sql.exec('SELECT 1');
      return json({ ok: true });
    }, { public: true });

    // ---- auth
    this.on('POST', '/api/auth/login', async (req) => {
      // Two limits, both checked before the (deliberately slow) password check: attempts per
      // address, and failures per account from all addresses together. A phone that has signed in
      // to the account before is exempt from the second, so strangers cannot lock its owner out.
      const max = Number(this.env.LOGIN_RATE_LIMIT_MAX ?? 5) || 5;
      const maxFailures = Number(this.env.LOGIN_FAILURE_MAX ?? 10) || 10;
      const ip = addressKey(req.headers.get('cf-connecting-ip') ?? 'unknown');
      const now = Date.now();
      this.sql.exec('DELETE FROM login_attempts WHERE at < ?', now - LOGIN_WINDOW_MS);
      const tries = one<{ n: number }>(this.sql, 'SELECT count(*) AS n FROM login_attempts WHERE ip = ?', ip)!.n;
      if (tries >= max) throw new HttpError(429, { error: 'rate_limited' });
      this.sql.exec('INSERT INTO login_attempts (ip, at) VALUES (?, ?)', ip, now);

      const body = LoginBody.parse(await readJson(req));
      const device = await this.trustedDevice(req, body.role);
      this.sql.exec('DELETE FROM login_failures WHERE at < ?', Date.now() - LOGIN_WINDOW_MS);
      const failures = one<{ n: number }>(this.sql, 'SELECT count(*) AS n FROM login_failures WHERE role = ?', body.role)!.n;
      if (failures >= maxFailures && !device) throw new HttpError(429, { error: 'rate_limited' });
      // Counted as a failure until it succeeds, so attempts running at the same time count too.
      const failure = one<{ id: number }>(
        this.sql,
        'INSERT INTO login_failures (role, at) VALUES (?, ?) RETURNING rowid AS id',
        body.role,
        Date.now(),
      )!.id;
      const user = one<UserRow>(this.sql, 'SELECT * FROM users WHERE role = ?', body.role);
      // Verifying against a throwaway hash when the role has no account keeps the timing the same.
      const ok = await verifyPassword(user?.password_hash ?? (await this.dummyHash()), body.password);
      if (!user || !ok) throw new HttpError(401, { error: 'invalid_credentials' });
      this.sql.exec('DELETE FROM login_failures WHERE rowid = ?', failure);

      const token = newToken();
      const expiresAt = Date.now() + SESSION_TTL_MS;
      this.sql.exec('DELETE FROM sessions WHERE expires_at < ?', Date.now());
      this.sql.exec(
        'INSERT INTO sessions (id, user_id, created_at, last_seen_at, expires_at) VALUES (?, ?, ?, ?, ?)',
        await hashToken(token),
        user.id,
        Date.now(),
        Date.now(),
        expiresAt,
      );
      const res: MeResponse = { user: { id: user.id, name: user.name, role: user.role }, users: this.users() };
      const out = json(res, 200, { 'set-cookie': this.cookie(token, expiresAt) });
      out.headers.append('set-cookie', await this.trustDevice(req, user));
      return out;
    }, { public: true });

    this.on('POST', '/api/auth/logout', async (req) => {
      const token = getCookie(req, this.origins.cookieName);
      if (isTokenFormat(token)) {
        const id = await hashToken(token);
        this.sql.exec('DELETE FROM sessions WHERE id = ?', id);
        for (const ws of this.ctx.getWebSockets(`session:${id}`)) ws.close(4401, 'signed out');
      }
      return json({ ok: true }, 200, { 'set-cookie': this.cookie('', 0) });
    }, { public: true });

    this.on('GET', '/api/me', async (req, _p, s) => {
      const out = json({ user: s!.user, users: this.users() } satisfies MeResponse);
      // Every app start: a trusted phone stays trusted while it is used. A phone becomes trusted
      // by typing the password, or here if it was signed in before trusted phones existed (a
      // session alone must not make a phone trusted: the trust outlives the session).
      const since = Number(one<{ value: string }>(this.sql, "SELECT value FROM meta WHERE key = 'trusted_devices_since'")?.value ?? 0);
      if (s!.createdAt < since || (await this.trustedDevice(req, s!.user.role))) {
        out.headers.append('set-cookie', await this.trustDevice(req, s!.user));
      }
      return out;
    });

    // ---- appointments
    this.on('GET', '/api/day', (req) => {
      const { date } = DayQuery.parse(Object.fromEntries(new URL(req.url).searchParams));
      const schedule = getDaySchedule(this.sql, date);
      const rows = listActiveBetween(this.sql, instantAt(date, '00:00').getTime(), instantAt(addDays(date, 1), '00:00').getTime());
      const body: DayResponse = {
        date,
        schedule,
        slots: slotStarts(schedule).map((d) => d.toISOString()),
        appointments: rows.map((r) => ({
          ...appointmentDto(r),
          withinHours: checkSlotAgainstHours(new Date(r.start_at), schedule) === null,
        })),
      };
      return json(body);
    });

    // One appointment, whatever its state: a phone whose change got no answer asks what became of it.
    this.on('GET', '/api/appointments/:id', (_req, p) => {
      const { id } = IdParams.parse(p);
      const row = one<AppointmentRow>(this.sql, 'SELECT * FROM appointments WHERE id = ?', id);
      if (!row) throw new HttpError(404, { error: 'not_found' });
      return json(appointmentDto(row));
    });

    this.on('POST', '/api/appointments', async (req, _p, s) => {
      const body = CreateAppointmentBody.parse(await readJson(req));
      const result = createAppointment(this.ctx.storage, s!.user, body);
      this.announce(result, 'create', s!.user.id);
      return json(result.appointment, 201);
    });

    this.on('PATCH', '/api/appointments/:id', async (req, p, s) => {
      const { id } = IdParams.parse(p);
      const body = UpdateAppointmentBody.parse(await readJson(req));
      const result = updateAppointment(this.ctx.storage, s!.user, id, body.version, body);
      this.announce(result, 'update', s!.user.id);
      return json(result.appointment);
    });

    this.on('POST', '/api/appointments/:id/cancel', async (req, p, s) => {
      const { id } = IdParams.parse(p);
      const body = CancelAppointmentBody.parse(await readJson(req));
      const result = cancelAppointment(this.ctx.storage, s!.user, id, body.version);
      this.announce(result, 'cancel', s!.user.id);
      return json(result.appointment);
    });

    // ---- working hours (both may edit; audited)
    this.on('GET', '/api/schedule', () => json({ weekly: getWeekly(this.sql), overrides: listOverrides(this.sql, clinicToday()) }));

    this.on('PUT', '/api/schedule/weekly/:weekday', async (req, p, s) => {
      const { weekday } = WeeklyDayParams.parse(p);
      const { version, ...hours } = WeeklyDayBody.parse(await readJson(req));
      const saved = setWeeklyDay(this.ctx.storage, s!.user.id, weekday, hours, version);
      this.broadcast('schedule', { by: s!.user.id });
      return json(saved);
    });

    this.on('PUT', '/api/schedule/overrides/:date', async (req, p, s) => {
      const { date } = OverrideParams.parse(p);
      const { version, ...override } = OverrideBody.parse(await readJson(req));
      const saved = upsertOverride(this.ctx.storage, s!.user.id, date, override, version);
      this.broadcast('schedule', { by: s!.user.id });
      return json(saved);
    });

    this.on('DELETE', '/api/schedule/overrides/:date', (req, p, s) => {
      const { date } = OverrideParams.parse(p);
      const { version } = DeleteOverrideQuery.parse(Object.fromEntries(new URL(req.url).searchParams));
      deleteOverride(this.ctx.storage, s!.user.id, date, version);
      this.broadcast('schedule', { by: s!.user.id });
      return new Response(null, { status: 204 });
    });

    // ---- notifications (the secretary's)
    this.on('GET', '/api/notifications', (_req, _p, s) => json(listUnread(this.sql, s!.user.id)));

    this.on('POST', '/api/notifications/read', async (req, _p, s) => {
      const body = MarkReadBody.parse(await readJson(req));
      const ids = markRead(this.ctx.storage, s!.user.id, 'all' in body ? 'all' : body.ids);
      // The same person's other phone clears its badge too.
      if (ids.length > 0) this.broadcast('notifications:read', { ids }, `user:${s!.user.id}`);
      return json({ ids });
    });

    // ---- backups
    this.on('GET', '/api/backups', () => {
      const list = listBackups(this.sql);
      const newest = list.find((b) => b.kind === 'daily') ?? null;
      const info = (b: (typeof list)[number]) => ({ name: b.name, bytes: b.bytes, at: new Date(b.at).toISOString() });
      const body: BackupsResponse & { items: ReturnType<typeof info>[] } = {
        enabled: true,
        latest: newest && info(newest),
        stale: !newest || Date.now() - newest.at > STALE_BACKUP_MS,
        items: list.map(info),
      };
      return json(body);
    });

    // The file holds every patient's name and phone: each download is recorded.
    this.on('GET', '/api/backups/:name', (_req, p, s) => {
      const text = backupForDownload(this.sql, p.name!);
      if (text === null) throw new HttpError(404, { error: 'not_found' });
      this.sql.exec(
        "INSERT INTO audit_log (user_id, entity, entity_id, action, before, after, at) VALUES (?, 'backup', ?, 'download', NULL, NULL, ?)",
        s!.user.id,
        p.name!,
        Date.now(),
      );
      return new Response(text, {
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'content-disposition': `attachment; filename="${p.name!}"`,
        },
      });
    });

    this.on('POST', '/api/backups/:name/restore', (_req, p, s) => {
      const safety = restoreBackup(this.ctx.storage, s!.user.id, p.name!, this.keep());
      // Every phone re-reads everything.
      this.broadcast('restored', { by: s!.user.id });
      return json({ restored: p.name, safetyBackup: safety.name });
    });

    if (this.env.TEST_MODE === '1') this.testRoutes();
  }

  private keep(): number {
    return Math.min(365, Math.max(1, Number(this.env.BACKUP_KEEP ?? 30) || 30));
  }

  private dummy: Promise<string> | null = null;
  private dummyHash(): Promise<string> {
    return (this.dummy ??= hashPassword(newToken()));
  }

  // ---------------------------------------------------------------- live channel

  /**
   * GET /api/live (WebSocket). Same checks as the API: one of our origins, a valid session.
   * A refused socket is accepted and closed at once, before anything is sent: with 4403 for a
   * foreign page, 4401 without a valid session. The phone can see the code (a refused upgrade
   * looks like any network failure) and goes to the login screen on 4401.
   */
  private async openLive(request: Request): Promise<Response> {
    if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') throw new HttpError(426, { error: 'bad_request' });
    const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];
    const refuse = (code: number, reason: string) => {
      server.accept();
      server.close(code, reason);
      return new Response(null, { status: 101, webSocket: client });
    };
    const origin = request.headers.get('origin');
    if (!origin || !this.origins.list.includes(origin)) return refuse(4403, 'forbidden');
    const session = await this.resolveSession(request, false);
    if (!session) return refuse(4401, 'unauthorized');
    this.ctx.acceptWebSocket(server, ['all', `user:${session.user.id}`, `session:${session.id}`]);
    server.serializeAttachment({ sessionId: session.id, userId: session.user.id } satisfies SocketInfo);
    return new Response(null, { status: 101, webSocket: client });
  }

  /**
   * Sends an event to the phones listening under `tag`. Each socket's session is checked first:
   * one that expired or was revoked (e.g. a password change) is closed and hears nothing more.
   */
  private broadcast(type: string, data: unknown, tag = 'all'): void {
    const sockets = this.ctx.getWebSockets(tag);
    if (sockets.length === 0) return;
    const infos = sockets.map((ws) => ws.deserializeAttachment() as SocketInfo | null);
    const ids = [...new Set(infos.filter(Boolean).map((i) => i!.sessionId))];
    const live = new Set(
      ids.length === 0
        ? []
        : all<{ id: string }>(
            this.sql,
            `SELECT id FROM sessions WHERE expires_at > ? AND id IN (${ids.map(() => '?').join(',')})`,
            Date.now(),
            ...ids,
          ).map((r) => r.id),
    );
    const message = JSON.stringify({ type, data });
    sockets.forEach((ws, i) => {
      const info = infos[i];
      try {
        if (!info || !live.has(info.sessionId)) ws.close(4401, 'unauthorized');
        else ws.send(message);
      } catch {
        // already closing
      }
    });
  }

  /** After a committed appointment change: everyone's day view, and the secretary's notification. */
  private announce(result: WriteResult, action: 'create' | 'update' | 'cancel', by: string): void {
    this.broadcast('appointment', { appointment: result.appointment, action, by });
    if (result.notification) this.broadcast('notification', result.notification.notification, `user:${result.notification.recipientId}`);
  }

  override webSocketMessage(): void {
    // Phones only listen; their keep-alive is answered by the auto-response.
  }

  override webSocketClose(ws: WebSocket, code: number): void {
    try {
      ws.close(code === 1005 || code === 1006 ? 1000 : code, 'closed');
    } catch {
      // already closed
    }
  }

  // ---------------------------------------------------------------- daily backup (cron)

  async dailyBackup(): Promise<string | null> {
    const newest = listBackups(this.sql).find((b) => b.kind === 'daily');
    if (newest && Date.now() - newest.at < DAILY_BACKUP_MIN_GAP_MS) return null;
    const b = this.ctx.storage.transactionSync(() => writeBackup(this.sql, 'daily', this.keep()));
    console.log(JSON.stringify({ msg: 'backup written', name: b.name, bytes: b.bytes }));
    return b.name;
  }

  // ---------------------------------------------------------------- tests only

  private testRoutes(): void {
    // Empties everything and creates the two accounts afresh (TEST_MODE only).
    this.on('POST', '/api/test/reset', async (req) => {
      const body = (await readJson(req)) as { keepSessions?: boolean };
      const tables = ['backup_chunks', 'backups', 'notifications', 'audit_log', 'appointments', 'date_overrides', 'weekly_schedule', 'counters', 'login_attempts', 'login_failures'];
      this.ctx.storage.transactionSync(() => {
        for (const t of tables) this.sql.exec(`DELETE FROM ${t}`);
        if (!body.keepSessions) {
          this.sql.exec('DELETE FROM trusted_devices');
          this.sql.exec('DELETE FROM sessions');
          this.sql.exec('DELETE FROM users');
        }
      });
      await this.ensureInitialData();
      return json({ users: this.users() });
    }, { public: true });

    this.on('POST', '/api/test/sql', async (req) => {
      const { query, params } = (await readJson(req)) as { query: string; params?: unknown[] };
      return json({ rows: all(this.sql, query, ...(params ?? [])) });
    }, { public: true });

    this.on('POST', '/api/test/backup', async () => json({ name: await this.dailyBackupNow() }), { public: true });
  }

  private async dailyBackupNow(): Promise<string> {
    return this.ctx.storage.transactionSync(() => writeBackup(this.sql, 'daily', this.keep())).name;
  }
}
