import { expect, test } from '@playwright/test';
import { E2E_NAMES } from './env';
import { AUTH, book, closeDb, contextAs, nextWeekday, openDay, resetData, slot } from './helpers';

const SAT = nextWeekday(6);
const THU = nextWeekday(4);

test.beforeEach(async () => {
  await resetData();
});
test.afterAll(async () => {
  await closeDb();
});

test.use({ storageState: AUTH.secretary });

function weekRow(page: import('@playwright/test').Page, weekday: number) {
  return page.locator(`.week-row[data-weekday="${weekday}"]`);
}

test('shortening Saturday keeps the 18:30 appointment and flags it', async ({ page }) => {
  await openDay(page, SAT);
  await book(page, SAT, '18:30', 'بیمار دیروقت', '09121234567');

  await page.goto('/settings/');
  const sat = weekRow(page, 6);
  await sat.getByLabel('شنبه: ساعت پایان').selectOption('18:00');
  await sat.getByRole('button', { name: 'ذخیره' }).click();
  await expect(page.getByText('ساعت شنبه ذخیره شد')).toBeVisible();

  await openDay(page, SAT);
  await expect(page.getByText('ساعت کاری ۱۴:۰۰ تا ۱۸:۰۰')).toBeVisible();
  await expect(slot(page, SAT, '18:30')).toContainText('بیمار دیروقت');
  await expect(slot(page, SAT, '18:30')).toContainText('خارج از ساعت کاری فعلی');
  await expect(page.locator('[data-slot]')).toHaveCount(9); // 8 bookable + the flagged one
});

test('a closed weekday can be opened', async ({ page }) => {
  await page.goto('/settings/');
  const thu = weekRow(page, 4);
  await thu.getByRole('button', { name: 'باز', exact: true }).click();
  await thu.getByLabel('پنجشنبه: ساعت شروع').selectOption('09:00');
  await thu.getByLabel('پنجشنبه: ساعت پایان').selectOption('12:00');
  await thu.getByRole('button', { name: 'ذخیره' }).click();
  await expect(page.getByText('ساعت پنجشنبه ذخیره شد')).toBeVisible();
  await openDay(page, THU);
  await expect(page.locator('[data-slot]')).toHaveCount(6);
});

test('closing one date with a note, then removing it', async ({ page }) => {
  await page.goto('/settings/');
  await page.getByRole('button', { name: 'افزودن روز خاص' }).click();
  const sheet = page.getByRole('dialog');
  // Find SAT in the calendar: step months until its day number shows, then pick it.
  await sheet.getByRole('button', { name: 'تعطیل', exact: true }).click();
  await sheet.getByLabel('توضیح (اختیاری)').fill('تعطیل رسمی');
  // Pick the date by navigating the calendar to SAT.
  const { jalaliMonthOf } = await import('../src/web/lib/jalali');
  const target = jalaliMonthOf(SAT);
  const today = jalaliMonthOf((await import('../src/shared/time')).clinicToday());
  if (target.title !== today.title) await sheet.getByRole('button', { name: 'ماه بعد' }).click();
  const dayNum = target.days.find((d) => d.date === SAT)!.day;
  const { fa } = await import('../src/web/lib/format');
  await sheet.getByRole('button', { name: fa(dayNum), exact: true }).click();
  await sheet.getByRole('button', { name: 'ذخیره' }).click();
  await expect(page.locator('.override-item')).toContainText('تعطیل رسمی');

  await openDay(page, SAT);
  await expect(page.getByTestId('closed')).toContainText('تعطیل رسمی');

  await page.goto('/settings/');
  await page.locator('.override-item').getByRole('button', { name: /^حذف/ }).click();
  await page.getByRole('button', { name: 'بله، حذف شود' }).click();
  await expect(page.getByText('روز خاصی ثبت نشده است.')).toBeVisible();
  await openDay(page, SAT);
  await expect(page.locator('[data-slot]')).toHaveCount(10);
});

test('saving hours from a stale screen shows what the other person saved', async ({ browser, page }) => {
  await page.goto('/settings/');
  const doctorCtx = await contextAs(browser, 'doctor');
  const doctor = await doctorCtx.newPage();
  await doctor.goto('/settings/');
  await weekRow(doctor, 6).getByLabel('شنبه: ساعت پایان').selectOption('17:00');
  await weekRow(doctor, 6).getByRole('button', { name: 'ذخیره' }).click();
  await expect(doctor.getByText('ساعت شنبه ذخیره شد')).toBeVisible();

  const sat = weekRow(page, 6);
  await sat.getByLabel('شنبه: ساعت شروع').selectOption('15:00');
  await sat.getByRole('button', { name: 'ذخیره' }).click();
  await expect(sat.getByText(`همین الان توسط ${E2E_NAMES.doctor} تغییر کرده است`)).toBeVisible();
  await expect(sat.getByLabel('شنبه: ساعت پایان')).toHaveValue('17:00');
  await doctorCtx.close();
});
