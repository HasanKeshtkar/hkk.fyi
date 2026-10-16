// Phase 5: backups visible and downloadable from Settings.
import { readFile, rm } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { runBackup } from '../src/server/backup/backup';
import { E2E_BACKUP_DIR, E2E_DATABASE_URL } from './env';
import { AUTH, closeDb, query, resetData } from './helpers';

test.beforeEach(async () => {
  await resetData();
});
test.afterAll(async () => {
  await closeDb();
});

test.describe('backups in Settings', () => {
  test.use({ storageState: AUTH.secretary });

  test('warns when there is no recent backup, then offers the newest one for download', async ({ page }) => {
    await rm(E2E_BACKUP_DIR, { recursive: true, force: true });
    await page.goto('/settings/');
    const card = page.getByTestId('backups');
    await expect(card.getByRole('alert')).toContainText('بیش از یک روز است انجام نشده است');

    const b = await runBackup({ databaseUrl: E2E_DATABASE_URL, dir: E2E_BACKUP_DIR, keep: 30 });
    await page.reload();
    await expect(card.getByRole('alert')).toHaveCount(0);
    await expect(card).toContainText('آخرین پشتیبان خودکار:');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      card.getByRole('link', { name: /دریافت آخرین پشتیبان/ }).click(),
    ]);
    expect(download.suggestedFilename()).toBe(b.name);
    const bytes = await readFile((await download.path())!);
    expect(bytes.subarray(0, 5).toString()).toBe('PGDMP');
    const audit = await query("select action from audit_log where entity = 'backup' and entity_id = $1", [b.name]);
    expect(audit.rows).toEqual([{ action: 'download' }]);
  });

  test('Settings explains how to put the app on the home screen', async ({ page }) => {
    await page.goto('/settings/');
    const card = page.getByRole('region', { name: 'نصب روی گوشی' });
    await expect(card).toContainText('«نصب برنامه»');
  });
});
