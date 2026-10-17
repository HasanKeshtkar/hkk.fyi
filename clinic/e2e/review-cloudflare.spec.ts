// Regression tests for the problems the review of the Cloudflare version found (client side).
import { expect, test } from '@playwright/test';
import { addDays } from '../src/shared/time';
import { E2E_ORIGIN } from './env';
import { AUTH, backupNow, book, closeDb, contextAs, nextWeekday, openDay, query, resetData, slot, slotIso } from './helpers';

const SAT = nextWeekday(6);
const MON = addDays(SAT, 2);

test.beforeEach(async () => {
  await resetData();
});
test.afterAll(async () => {
  await closeDb();
});

test.describe('as the secretary', () => {
  test.use({ storageState: AUTH.secretary });

  test('a cancel whose answer was lost is recognised as hers, not blamed on the other person', async ({ page }) => {
    await openDay(page, SAT);
    await book(page, SAT, '14:00', 'علی', '09121234567');
    await page.route('**/api/appointments/*/cancel', async (route) => {
      await route.fetch(); // the server cancels it…
      await route.abort('connectionreset'); // …but the phone never hears back
    });
    await slot(page, SAT, '14:00').getByRole('button').click();
    await page.getByRole('button', { name: 'لغو نوبت' }).click();
    await page.getByRole('button', { name: 'بله، لغو شود' }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet).toContainText('لغو این نوبت به احتمال زیاد انجام شده است');
    await expect(sheet).not.toContainText('توسط کاربر دیگر');
    await expect(sheet.getByRole('button', { name: 'لغو نوبت' })).toHaveCount(0);
    expect((await query('select status from appointments')).rows).toEqual([{ status: 'cancelled' }]);
  });

  test('a cancel that never reached the server is not taken for hers when the other person then moves it', async ({ page, browser }) => {
    await openDay(page, SAT);
    await book(page, SAT, '14:00', 'علی', '09121234567');
    await page.route('**/api/appointments/*/cancel', (route) => route.abort('connectionreset'), { times: 1 });
    await slot(page, SAT, '14:00').getByRole('button').click();
    await page.getByRole('button', { name: 'لغو نوبت' }).click();
    await page.getByRole('button', { name: 'بله، لغو شود' }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet).toContainText('معلوم نیست ذخیره شد یا نه');
    await expect(page.getByTestId('connection')).toHaveText('آنلاین'); // re-read: it is still there
    // The doctor moves it to Monday.
    const doctorCtx = await contextAs(browser, 'doctor');
    const doctor = await doctorCtx.newPage();
    const { id, version } = (await query('select id, version from appointments')).rows[0];
    const res = await doctor.request.fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      data: { version, startAt: slotIso(MON, '08:00') },
      headers: { origin: E2E_ORIGIN },
    });
    expect(res.status()).toBe(200);
    await expect(sheet).toContainText('توسط کاربر دیگر جابه‌جا یا لغو شد');
    await expect(sheet).not.toContainText('به احتمال زیاد');
    await doctorCtx.close();
  });

  test('closing a weekday whose hidden hours were left the wrong way round still saves', async ({ page }) => {
    await page.goto('/settings/');
    const mon = page.locator('.week-row[data-weekday="1"]');
    await mon.getByLabel('دوشنبه: ساعت شروع').selectOption('13:00'); // after the end (12:00)
    await expect(mon.getByRole('button', { name: 'ذخیره' })).toBeDisabled();
    await mon.getByRole('button', { name: 'تعطیل' }).click();
    await mon.getByRole('button', { name: 'ذخیره' }).click();
    await expect(page.getByText('ساعت دوشنبه ذخیره شد')).toBeVisible();
    expect((await query('select is_open, start_time, end_time from weekly_schedule where weekday = 1')).rows).toEqual([
      { is_open: 0, start_time: '08:00', end_time: '12:00' },
    ]);
  });

  test('a confirmation left open when the connection drops cannot be confirmed until it is back', async ({ page, context }) => {
    await backupNow();
    await page.goto('/settings/');
    await page.getByRole('button', { name: 'برگرداندن اطلاعات به یک روز قبل' }).click();
    await page.getByRole('dialog').getByRole('button', { name: /پشتیبان روزانه/ }).click();
    const confirm = page.getByRole('button', { name: 'بله، برگردان' });
    await expect(confirm).toBeEnabled();
    await context.setOffline(true);
    await expect(confirm).toBeDisabled();
    await expect(page.getByRole('alertdialog')).toContainText('اتصال برقرار نیست');
    await context.setOffline(false);
    await expect(confirm).toBeEnabled();
    expect((await query("select count(*) as n from audit_log where entity = 'backup'")).rows[0].n).toBe(0);
  });
});

test('"mark all read" marks only the notifications on the list, by id', async ({ browser }) => {
  const doctorCtx = await contextAs(browser, 'doctor');
  const secCtx = await contextAs(browser, 'secretary');
  const doctor = await doctorCtx.newPage();
  const sec = await secCtx.newPage();
  await openDay(doctor, SAT);
  await openDay(sec, SAT);
  await book(doctor, SAT, '15:00', 'مریم احمدی', '09121234567');
  await expect(sec.getByTestId('bell')).toContainText('۱');
  await sec.getByTestId('bell').click();
  const listed = (await query('select id from notifications')).rows.map((r) => r.id);
  const [request] = await Promise.all([
    sec.waitForRequest('**/api/notifications/read'),
    sec.getByRole('button', { name: 'همه را خواندم' }).click(),
  ]);
  expect(request.postDataJSON()).toEqual({ ids: listed });
  await expect(sec.getByTestId('bell').locator('.badge')).toHaveCount(0);
  await doctorCtx.close();
  await secCtx.close();
});
