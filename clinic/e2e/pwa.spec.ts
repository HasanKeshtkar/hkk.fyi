// The installable app: a valid manifest and icons, and a service worker that opens the app
// offline (saying so) while never storing any patient data on the phone.
import { expect, test } from '@playwright/test';
import { AUTH, closeDb, nextWeekday, resetData, slotIso } from './helpers';
import { E2E_ORIGIN } from './env';

test.use({ serviceWorkers: 'allow', storageState: AUTH.secretary });

test.beforeEach(async () => {
  await resetData();
});
test.afterAll(async () => {
  await closeDb();
});

/** Width and height from a PNG's header. */
function pngSize(buf: Buffer): [number, number] {
  expect(buf.subarray(1, 4).toString()).toBe('PNG');
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

test('the manifest and icons are what Chrome needs to install the app', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  // Chrome's own verdict ('in-incognito' only because test browsers are: a phone's Chrome is not).
  const cdp = await context.newCDPSession(page);
  const errors = async () =>
    (await cdp.send('Page.getInstallabilityErrors')).installabilityErrors.map((e) => e.errorId).filter((id) => id !== 'in-incognito');
  await expect.poll(errors).toEqual([]);

  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const res = await page.request.get(href!);
  expect(res.headers()['content-type']).toContain('application/manifest+json');
  const m = await res.json();
  expect(m).toMatchObject({ start_url: '/', scope: '/', display: 'standalone', lang: 'fa', dir: 'rtl' });
  expect(m.name).toBe('نوبت‌دهی مطب');
  for (const icon of m.icons) {
    const r = await page.request.get(icon.src);
    expect(r.status()).toBe(200);
    expect(r.headers()['content-type']).toBe('image/png');
    const [w, h] = pngSize(await r.body());
    expect(`${w}x${h}`).toBe(icon.sizes);
  }
  expect(m.icons.map((i: { purpose: string; sizes: string }) => `${i.purpose} ${i.sizes}`)).toEqual(
    expect.arrayContaining(['any 192x192', 'any 512x512', 'maskable 512x512']),
  );
});

test('offline, the installed app still opens and says it cannot connect; it keeps no patient data', async ({ page, context }) => {
  // Some patient data on screen first, so there is something that must not be saved.
  const sat = nextWeekday(6);
  const res = await page.request.post('/api/appointments', {
    data: { startAt: slotIso(sat, '14:00'), patientName: 'مریم احمدی', patientPhone: '09121234567' },
    headers: { origin: E2E_ORIGIN },
  });
  expect(res.ok()).toBe(true);
  await page.goto(`/?d=${sat}`);
  await expect(page.getByText('مریم احمدی')).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('اتصال به سرور برقرار نیست.')).toBeVisible();
  await expect(page.getByText('مریم احمدی')).toHaveCount(0);

  const saved = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys()) for (const r of await (await caches.open(name)).keys()) urls.push(r.url);
    return urls;
  });
  expect(saved.length).toBeGreaterThan(3);
  expect(saved.filter((u) => u.includes('/api/'))).toEqual([]);

  // Back online: one tap and everything is live again.
  await context.setOffline(false);
  await page.getByRole('button', { name: 'دوباره امتحان کنید' }).click();
  await expect(page.getByTestId('connection')).toHaveText('آنلاین');
  await expect(page.getByText('مریم احمدی')).toBeVisible();
});
