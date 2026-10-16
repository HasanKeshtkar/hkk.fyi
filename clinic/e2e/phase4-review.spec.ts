// Regression tests for the problems the phase 4 review found.
import { expect, test, type Page } from '@playwright/test';
import { E2E_ORIGIN, E2E_PASSWORDS } from './env';
import { closeDb, contextAs, nextWeekday, openDay, query, resetData, slotIso } from './helpers';

const SAT = nextWeekday(6);

test.beforeEach(async () => {
  await resetData();
});
test.afterAll(async () => {
  await closeDb();
});

async function api(page: Page, method: 'POST' | 'PATCH', path: string, data: unknown) {
  const res = await page.request.fetch(path, { method, data, headers: { origin: E2E_ORIGIN } });
  expect(res.ok(), `${method} ${path} → ${res.status()}`).toBe(true);
  return res.json();
}

const bookAs = (page: Page, time: string, name: string) =>
  api(page, 'POST', '/api/appointments', { startAt: slotIso(SAT, time), patientName: name, patientPhone: '09121234567' });

// End to end: a tap on a touch screen, then the doctor's change plays the chime. (Playwright's
// navigation already counts as an interaction, so the touch-activation rule itself is covered by
// tests/web/chime.test.ts.)
test('the chime plays on a touch screen after a tap (app opened with a saved session)', async ({ browser }) => {
  const doctorCtx = await contextAs(browser, 'doctor');
  const secCtx = await contextAs(browser, 'secretary');
  // Count the notes played.
  await secCtx.addInitScript(() => {
    const w = window as unknown as { __notes: number };
    w.__notes = 0;
    const start = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (...args: Parameters<OscillatorNode['start']>) {
      w.__notes++;
      return start.apply(this, args);
    };
  });
  const doctor = await doctorCtx.newPage();
  const sec = await secCtx.newPage();
  await openDay(sec, SAT);
  const box = (await sec.getByTestId('slots').boundingBox())!;
  await sec.touchscreen.tap(box.x + box.width / 2, box.y - 20); // a tap on the day header, nothing else
  await doctor.goto('/');
  await bookAs(doctor, '15:00', 'مریم احمدی');
  await expect(sec.locator('.toast')).toContainText('نوبت جدید');
  await expect.poll(() => sec.evaluate(() => (window as unknown as { __notes: number }).__notes)).toBe(2);
  await doctorCtx.close();
  await secCtx.close();
});

test('reading one of three notifications lowers the badge by exactly one', async ({ browser }) => {
  const doctorCtx = await contextAs(browser, 'doctor');
  const secCtx = await contextAs(browser, 'secretary');
  const doctor = await doctorCtx.newPage();
  const sec = await secCtx.newPage();
  await doctor.goto('/');
  for (const [t, n] of [['14:00', 'یک'], ['14:30', 'دو'], ['15:00', 'سه']]) await bookAs(doctor, t!, n!);
  await openDay(sec, SAT);
  await expect(sec.getByTestId('bell')).toContainText('۳');
  await sec.getByTestId('bell').click();
  await sec.getByRole('dialog').getByRole('button', { name: /دو/ }).click();
  await expect(sec.getByRole('dialog')).toHaveCount(0);
  await sec.waitForTimeout(500); // the phone's own read echo comes back over the socket
  await expect(sec.getByTestId('bell')).toContainText('۲');
  await expect(sec).toHaveTitle('(۲) نوبت‌دهی مطب');
  await doctorCtx.close();
  await secCtx.close();
});

test('a phone refused while the database was briefly down reconnects by itself once it is back', async ({ browser }) => {
  const secCtx = await contextAs(browser, 'secretary');
  const sec = await secCtx.newPage();
  const sockets: { close: () => Promise<void> }[] = [];
  await sec.routeWebSocket(/\/socket\.io\//, (ws) => {
    ws.connectToServer();
    sockets.push(ws);
  });
  await openDay(sec, SAT);
  try {
    await query('alter table sessions rename to sessions_away');
    await sockets.at(-1)!.close(); // the connection drops while the database is unavailable
    await expect(sec.getByTestId('connection')).toHaveText('در حال اتصال');
    await expect.poll(() => sockets.length).toBeGreaterThan(1); // the reconnect was refused…
    await sec.waitForTimeout(1000);
  } finally {
    await query('alter table sessions_away rename to sessions');
  }
  // …and is retried without leaving or touching the app.
  await expect(sec.getByTestId('connection')).toHaveText('آنلاین', { timeout: 10_000 });
  await secCtx.close();
});

test('when the server rejects the session, the phone closes its live channel and opens a new one after signing in', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const opened: { closed: boolean }[] = [];
  page.on('websocket', (ws) => {
    const entry = { closed: false };
    opened.push(entry);
    ws.on('close', () => (entry.closed = true));
  });
  const signIn = async () => {
    await page.waitForURL('**/login/');
    await page.getByRole('button', { name: 'منشی' }).click();
    await page.getByLabel('رمز عبور').fill(E2E_PASSWORDS.secretary);
    await page.getByRole('button', { name: 'ورود' }).click();
    await expect(page.getByTestId('connection')).toHaveText('آنلاین');
  };
  const since = (await query('select now() as t')).rows[0].t;
  await page.goto('/');
  await signIn();
  expect(opened).toHaveLength(1);

  // This phone's session is revoked (only this one: the stored test sessions are older).
  await query('delete from sessions where created_at >= $1', [since]);
  await page.getByRole('button', { name: 'روز بعد' }).click(); // any request now gets 401
  await page.waitForURL('**/login/');
  await expect.poll(() => opened[0]!.closed).toBe(true);

  await signIn();
  expect(opened.length).toBeGreaterThanOrEqual(2);
  expect(opened.at(-1)!.closed).toBe(false);
  await ctx.close();
});
