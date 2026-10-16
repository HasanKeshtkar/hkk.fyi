// Backups in Settings: status, download, and going back to an earlier copy.
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { AUTH, backupNow, book, closeDb, contextAs, nextWeekday, openDay, query, resetData, slot } from './helpers';

const SAT = nextWeekday(6);

test.beforeEach(async () => {
  await resetData();
});
test.afterAll(async () => {
  await closeDb();
});

test.describe('backups in Settings', () => {
  test.use({ storageState: AUTH.secretary });

  test('warns when there is no recent backup, then offers the newest one for download', async ({ page }) => {
    await page.goto('/settings/');
    const card = page.getByTestId('backups');
    await expect(card.getByRole('alert')).toContainText('بیش از یک روز است انجام نشده است');

    const name = await backupNow();
    await page.reload();
    await expect(card.getByRole('alert')).toHaveCount(0);
    await expect(card).toContainText('آخرین پشتیبان خودکار:');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      card.getByRole('link', { name: /دریافت آخرین پشتیبان/ }).click(),
    ]);
    expect(download.suggestedFilename()).toBe(name);
    const file = JSON.parse(await readFile((await download.path())!, 'utf8'));
    expect(file).toMatchObject({ format: 'clinic-backup', version: 1 });
    const audit = await query("select action from audit_log where entity = 'backup' and entity_id = ?", [name]);
    expect(audit.rows).toEqual([{ action: 'download' }]);
  });

  test('going back to an earlier copy, after confirming; the other phone follows at once', async ({ page, browser }) => {
    await openDay(page, SAT);
    await book(page, SAT, '14:00', 'پیش از پشتیبان', '09121234567');
    await backupNow();
    // A mistake after the backup: the appointment is cancelled.
    await slot(page, SAT, '14:00').getByRole('button').click();
    await page.getByRole('button', { name: 'لغو نوبت' }).click();
    await page.getByRole('button', { name: 'بله، لغو شود' }).click();
    await expect(slot(page, SAT, '14:00')).toContainText('خالی');

    const doctorCtx = await contextAs(browser, 'doctor');
    const doctor = await doctorCtx.newPage();
    await openDay(doctor, SAT);
    await expect(slot(doctor, SAT, '14:00')).toContainText('خالی');

    await page.goto('/settings/');
    await page.getByRole('button', { name: 'برگرداندن اطلاعات به یک روز قبل' }).click();
    await page.getByRole('dialog').getByRole('button', { name: /پشتیبان روزانه/ }).click();
    await expect(page.getByRole('alertdialog')).toContainText('وضعیت فعلی هم قبلش ذخیره می‌شود');
    await page.getByRole('button', { name: 'بله، برگردان' }).click();
    await expect(page.locator('.toast')).toContainText('اطلاعات به نسخه');

    // The doctor's phone re-reads by itself.
    await expect(slot(doctor, SAT, '14:00')).toContainText('پیش از پشتیبان');
    await openDay(page, SAT);
    await expect(slot(page, SAT, '14:00')).toContainText('پیش از پشتیبان');
    expect((await query("select action from audit_log where entity = 'backup'")).rows).toEqual([{ action: 'restore' }]);
    await doctorCtx.close();
  });

  test('Settings explains how to put the app on the home screen', async ({ page }) => {
    await page.goto('/settings/');
    const card = page.getByRole('region', { name: 'نصب روی گوشی' });
    await expect(card).toContainText('«نصب برنامه»');
  });
});
