import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import pg from 'pg';
import { DEFAULT_WEEKLY_SCHEDULE } from '../src/server/db/defaults';
import { addDays, clinicToday, instantAt, weekdayOf, type IsoDate } from '../src/shared/time';
import { E2E_DATABASE_URL } from './env';

export const AUTH = { doctor: 'e2e/.auth/doctor.json', secretary: 'e2e/.auth/secretary.json' } as const;

let pool: pg.Pool | null = null;
function db(): pg.Pool {
  pool ??= new pg.Pool({ connectionString: E2E_DATABASE_URL, max: 2 });
  return pool;
}

/** Clears appointments and exceptions and restores the default hours (sessions are kept). */
export async function resetData(): Promise<void> {
  await db().query('truncate notifications, audit_log, appointments, date_overrides restart identity cascade');
  await db().query('delete from weekly_schedule');
  for (const w of DEFAULT_WEEKLY_SCHEDULE) {
    await db().query('insert into weekly_schedule (weekday, is_open, start_time, end_time) values ($1, $2, $3, $4)', [
      w.weekday,
      w.isOpen,
      w.startTime,
      w.endTime,
    ]);
  }
}

/** A direct query on the test database. */
export async function query(text: string, params: unknown[] = []): Promise<pg.QueryResult> {
  return db().query(text, params);
}

export async function closeDb(): Promise<void> {
  await pool?.end();
  pool = null;
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
