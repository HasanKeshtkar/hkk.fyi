import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { addDays, clinicToday, instantAt, weekdayOf, type IsoDate } from '../src/shared/time';
import { E2E_ORIGIN } from './env';

export const AUTH = { doctor: 'e2e/.auth/doctor.json', secretary: 'e2e/.auth/secretary.json' } as const;

async function testApi<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${E2E_ORIGIN}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: E2E_ORIGIN },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

/** Clears appointments, hours, notifications, backups (test-only route; accounts and sessions are kept). */
export async function resetData(): Promise<void> {
  await testApi('/api/test/reset', { keepSessions: true });
}

/** A direct query on the app's database (test-only route). Parameters are `?`. */
export async function query(text: string, params: unknown[] = []): Promise<{ rows: any[] }> {
  return testApi('/api/test/sql', { query: text, params });
}

/** A backup now, as the daily one would be (test-only route). */
export async function backupNow(): Promise<string> {
  return (await testApi<{ name: string }>('/api/test/backup', {})).name;
}

export async function closeDb(): Promise<void> {
  // Nothing to close: the tests talk to the app over HTTP.
}

/** The next date (from tomorrow on) that falls on `weekday` (0 = Sunday … 6 = Saturday). */
export function nextWeekday(weekday: number): IsoDate {
  let d = addDays(clinicToday(), 1);
  while (weekdayOf(d) !== weekday) d = addDays(d, 1);
  return d;
}

export const slotIso = (date: IsoDate, time: string) => instantAt(date, time).toISOString();

export function slot(page: Page, date: IsoDate, time: string) {
  return page.locator(`[data-slot="${slotIso(date, time)}"]`);
}

export async function openDay(page: Page, date: IsoDate): Promise<void> {
  await page.goto(`/?d=${date}`);
  await expect(page.getByTestId('connection')).toHaveText('آنلاین');
  await expect(page.getByTestId('slots').or(page.getByTestId('closed')).first()).toBeVisible();
}

export async function contextAs(browser: Browser, role: keyof typeof AUTH): Promise<BrowserContext> {
  return browser.newContext({ storageState: AUTH[role] });
}

/** Books through the UI: tap the slot, type name and phone, save. */
export async function book(page: Page, date: IsoDate, time: string, name: string, phone: string): Promise<void> {
  await slot(page, date, time).click();
  await page.getByLabel('نام بیمار').fill(name);
  await page.getByLabel('شماره موبایل').fill(phone);
  await page.getByRole('button', { name: 'ذخیره نوبت' }).click();
  await expect(slot(page, date, time)).toContainText(name);
}
