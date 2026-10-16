// Regression tests for the problems the phase 3 review found.
import { expect, test } from '@playwright/test';
import { E2E_ORIGIN } from './env';
import { AUTH, book, closeDb, contextAs, nextWeekday, openDay, resetData, slot } from './helpers';

const SAT = nextWeekday(6);

test.beforeEach(async () => {
  await resetData();
});
test.afterAll(async () => {
  await closeDb();
});

test.describe('as the secretary', () => {
  test.use({ storageState: AUTH.secretary });

  test('Android Back closes the open sheet (and only the top dialog) instead of leaving the app', async ({ page }) => {
    await openDay(page, SAT);
    const url = page.url();
    await slot(page, SAT, '14:00').click();
    await page.getByLabel('نام بیمار').fill('زهره');
    await page.goBack();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(page.url()).toBe(url);
    await expect(page.getByTestId('slots')).toBeVisible();

    // A dialog over a sheet: Back closes the dialog, then the sheet.
    await book(page, SAT, '15:00', 'علی', '09121234567');
    await slot(page, SAT, '15:00').getByRole('button').click();
    await page.getByRole('button', { name: 'لغو نوبت' }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(1);
    await page.goBack();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(page.url()).toBe(url);
    await expect(slot(page, SAT, '15:00')).toContainText('علی'); // nothing was cancelled
  });

  test('closing a sheet with ✕ does not leave an extra Back step behind', async ({ page }) => {
    await page.goto('/');
    await openDay(page, SAT);
    await slot(page, SAT, '14:00').click();
    await page.getByRole('button', { name: 'بستن' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.waitForTimeout(100);
    await page.goBack(); // back to the page before (the first goto), not to a phantom sheet entry
    await expect(page).toHaveURL(/\/$/);
  });

  test('picking a day in the calendar navigates and closes it', async ({ page }) => {
    await openDay(page, SAT);
    await page.getByTestId('day-label').click();
    await page.getByRole('dialog').getByRole('button', { name: 'ماه بعد' }).click();
    await page.getByRole('dialog').getByRole('button', { name: '۲', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('day-label')).toContainText(' ۲ ');
    await expect(page).toHaveURL(/d=\d{4}-\d{2}-\d{2}/);
  });

  test('Jalali dates are right in January–February of a Gregorian leap year', async ({ page }) => {
    await page.goto('/?d=2028-01-01');
    await expect(page.getByTestId('day-label')).toHaveText(/شنبه ۱۱ دی ۱۴۰۶/);
    await page.getByTestId('day-label').click();
    await expect(page.getByRole('dialog').locator('.cal-day')).toHaveCount(30);
  });

  test('toasts do not block the top bar', async ({ page }) => {
    await openDay(page, SAT);
    await book(page, SAT, '14:00', 'علی', '09121234567');
    await expect(page.getByText('نوبت ثبت شد')).toBeVisible();
    await page.getByRole('link', { name: 'تنظیمات ساعت کاری' }).click();
    await expect(page).toHaveURL(/\/settings\/$/);
  });

  test('a save whose answer was lost is recognised on retry instead of reported as "taken"', async ({ page }) => {
    await openDay(page, SAT);
    let dropped = false;
    await page.route('**/api/appointments', async (route) => {
      if (dropped || route.request().method() !== 'POST') return route.continue();
      dropped = true;
      await route.fetch(); // the server books it…
      await route.abort('connectionreset'); // …but the phone never hears back
    });
    await slot(page, SAT, '16:00').click();
    await page.getByLabel('نام بیمار').fill('زهرا کریمی');
    await page.getByLabel('شماره موبایل').fill('09121234567');
    await page.getByRole('button', { name: 'ذخیره نوبت' }).click();
    await expect(page.locator('.alert[role="alert"]')).toContainText('معلوم نیست ذخیره شد');
    await page.getByRole('button', { name: 'ذخیره نوبت' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('نوبت ثبت شده است')).toBeVisible();
    await expect(slot(page, SAT, '16:00')).toContainText('زهرا کریمی');
  });

  test('the phone number on the call button keeps its digit order', async ({ page }) => {
    await openDay(page, SAT);
    await book(page, SAT, '14:00', 'علی', '09121234567');
    await slot(page, SAT, '14:00').getByRole('button').click();
    const call = page.getByRole('dialog').getByRole('link', { name: /تماس با/ });
    await expect(call).toHaveAttribute('href', 'tel:09121234567');
    const text = await call.textContent();
    expect(text).toContain('⁦۰۹۱۲ ۱۲۳ ۴۵۶۷⁩');
  });

  test('offline: logout is disabled and empty slots say why they cannot be tapped', async ({ page, context }) => {
    await openDay(page, SAT);
    await context.setOffline(true);
    await expect(page.getByTestId('connection')).toHaveText('قطع');
    await expect(slot(page, SAT, '14:00')).toContainText('بدون اتصال');
    await context.setOffline(false);
    await expect(page.getByTestId('connection')).toHaveText('آنلاین');
    await page.getByRole('link', { name: 'تنظیمات ساعت کاری' }).click();
    await expect(page.getByRole('button', { name: 'خروج از حساب' })).toBeEnabled();
    await context.setOffline(true);
    await expect(page.getByRole('button', { name: 'خروج از حساب' })).toBeDisabled();
    await context.setOffline(false);
  });
});

test('an override removed by the other person: the save explains it, the next save recreates it', async ({ browser }) => {
  const doctorCtx = await contextAs(browser, 'doctor');
  const secCtx = await contextAs(browser, 'secretary');
  const doctor = await doctorCtx.newPage();
  const sec = await secCtx.newPage();

  // Secretary closes SAT with a note.
  const res = await sec.request.put(`/api/schedule/overrides/${SAT}`, {
    headers: { origin: E2E_ORIGIN },
    data: { isOpen: false, startTime: null, endTime: null, note: 'سمینار', version: null },
  });
  expect(res.status()).toBe(200);
  const created = await res.json();

  await doctor.goto('/settings/');
  await doctor.locator('.override-item').getByRole('button', { name: /سمینار/ }).click();
  const sheet = doctor.getByRole('dialog');
  await sheet.getByLabel('توضیح (اختیاری)').fill('سمینار دندانپزشکی');

  const del = await sec.request.delete(`/api/schedule/overrides/${SAT}?version=${created.version}`, {
    headers: { origin: E2E_ORIGIN },
  });
  expect(del.status()).toBe(204);

  await sheet.getByRole('button', { name: 'ذخیره' }).click();
  await expect(sheet.getByText('همین الان توسط کاربر دیگر حذف شد')).toBeVisible();
  await sheet.getByRole('button', { name: 'ذخیره' }).click();
  await expect(doctor.getByRole('dialog')).toHaveCount(0);
  await expect(doctor.locator('.override-item')).toContainText('سمینار دندانپزشکی');
  await doctorCtx.close();
  await secCtx.close();
});
