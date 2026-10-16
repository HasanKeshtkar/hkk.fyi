import { expect, test } from '@playwright/test';
import { E2E_NAMES, E2E_PASSWORDS } from './env';
import { AUTH, book, closeDb, contextAs, nextWeekday, openDay, resetData, slot, slotIso } from './helpers';

const SAT = nextWeekday(6);
const MON = nextWeekday(1);
const THU = nextWeekday(4);

test.beforeEach(async () => {
  await resetData();
});
test.afterAll(async () => {
  await closeDb();
});

test.describe('login', () => {
  test('wrong password is refused with a message, the right one opens the day', async ({ page }) => {
    await page.goto('/login/');
    await page.getByRole('button', { name: 'دکتر' }).click();
    await page.getByLabel('رمز عبور').fill('not-the-password');
    await page.getByRole('button', { name: 'ورود' }).click();
    await expect(page.locator('.alert[role="alert"]')).toHaveText('رمز عبور اشتباه است.');
    await page.getByLabel('رمز عبور').fill(E2E_PASSWORDS.doctor);
    await page.getByRole('button', { name: 'ورود' }).click();
    await page.waitForURL((u) => u.pathname === '/');
    await expect(page.getByTestId('connection')).toHaveText('آنلاین');
  });
});

test.describe('as the secretary', () => {
  test.use({ storageState: AUTH.secretary });

  test('the day lists every 30-minute slot of the working hours', async ({ page }) => {
    await openDay(page, SAT);
    await expect(page.locator('[data-slot]')).toHaveCount(10); // 14:00 … 18:30
    await expect(slot(page, SAT, '14:00')).toContainText('۱۴:۰۰');
    await expect(slot(page, SAT, '18:30')).toContainText('۱۸:۳۰');
    await expect(page.getByText('ساعت کاری ۱۴:۰۰ تا ۱۹:۰۰')).toBeVisible();

    await openDay(page, MON);
    await expect(page.locator('[data-slot]')).toHaveCount(8); // 08:00 … 11:30
  });

  test('a closed day says so', async ({ page }) => {
    await openDay(page, THU);
    await expect(page.getByTestId('closed')).toContainText('تعطیل');
    await expect(page.locator('[data-slot]')).toHaveCount(0);
  });

  test('booking takes three steps: tap the slot, type name and phone, save', async ({ page }) => {
    await openDay(page, SAT);
    await slot(page, SAT, '15:00').click();
    // The name field is focused already; Enter moves to the phone; Enter on the phone saves.
    await page.keyboard.type('مریم احمدی');
    await page.keyboard.press('Enter');
    await page.keyboard.type('۰۹۱۲ ۱۲۳ ۴۵۶۷');
    await page.keyboard.press('Enter');
    const row = slot(page, SAT, '15:00');
    await expect(row).toContainText('مریم احمدی');
    await expect(row).toContainText('۰۹۱۲ ۱۲۳ ۴۵۶۷');
    await expect(row.getByRole('link')).toHaveAttribute('href', 'tel:09121234567');
    await expect(page.getByText('نوبت ثبت شد')).toBeVisible();
  });

  test('invalid input is explained next to the field and nothing is saved', async ({ page }) => {
    await openDay(page, SAT);
    await slot(page, SAT, '14:00').click();
    await page.getByLabel('نام بیمار').fill('   ');
    await page.getByLabel('شماره موبایل').fill('021 1234 5678');
    await page.getByRole('button', { name: 'ذخیره نوبت' }).click();
    await expect(page.getByText('نام بیمار را وارد کنید.')).toBeVisible();
    await expect(page.getByText(/شماره موبایل درست نیست/)).toBeVisible();
    await page.getByRole('button', { name: 'بستن' }).click();
    await expect(slot(page, SAT, '14:00')).toContainText('خالی');
  });

  test('edit, move to another day, then cancel after confirming', async ({ page }) => {
    await openDay(page, SAT);
    await book(page, SAT, '14:00', 'علی رضایی', '09121234567');

    await slot(page, SAT, '14:00').getByRole('button').click();
    await page.getByLabel('نام بیمار').fill('علی رضایی‌نژاد');
    await page.getByRole('button', { name: 'ذخیره تغییرات' }).click();
    await expect(slot(page, SAT, '14:00')).toContainText('علی رضایی‌نژاد');

    // Move to Monday 08:30.
    await slot(page, SAT, '14:00').getByRole('button').click();
    await page.getByRole('button', { name: 'تغییر ساعت' }).click();
    for (let d = SAT; d !== MON; ) {
      await page.getByRole('dialog').getByRole('button', { name: 'روز بعد' }).click();
      d = (await import('../src/shared/time')).addDays(d, 1);
    }
    await page.getByRole('dialog').getByRole('button', { name: '۰۸:۳۰', exact: true }).click();
    await page.getByRole('button', { name: 'انتقال به ساعت ۰۸:۳۰' }).click();
    await page.getByRole('button', { name: 'بله، منتقل شود' }).click();
    await expect(slot(page, SAT, '14:00')).toContainText('خالی');
    await openDay(page, MON);
    await expect(slot(page, MON, '08:30')).toContainText('علی رضایی‌نژاد');

    // Cancel asks first; "no" keeps it.
    await slot(page, MON, '08:30').getByRole('button').click();
    await page.getByRole('button', { name: 'لغو نوبت' }).click();
    await page.getByRole('button', { name: 'نه' }).click();
    await page.getByRole('button', { name: 'لغو نوبت' }).click();
    await page.getByRole('button', { name: 'بله، لغو شود' }).click();
    await expect(slot(page, MON, '08:30')).toContainText('خالی');
    await expect(page.getByText('نوبت لغو شد')).toBeVisible();
  });

  test('prev/next and the Jalali calendar change the day', async ({ page }) => {
    await openDay(page, SAT);
    await page.getByRole('button', { name: 'روز بعد' }).click();
    await expect(page).toHaveURL(new RegExp(`d=${(await import('../src/shared/time')).addDays(SAT, 1)}`));
    await page.getByRole('button', { name: 'روز قبل' }).click();
    await expect(page).toHaveURL(new RegExp(`d=${SAT}`));
    await page.getByTestId('day-label').click();
    await expect(page.getByRole('dialog', { name: 'انتخاب روز' })).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'ماه بعد' }).click();
    await page.getByRole('dialog').getByRole('button', { name: '۱', exact: true }).click();
    await expect(page.getByTestId('day-label')).toContainText(' ۱ ');
  });
});

test.describe('two people at once', () => {
  test('a slot booked by the doctor a moment earlier is reported with who and for whom', async ({ browser }) => {
    const doctorCtx = await contextAs(browser, 'doctor');
    const secCtx = await contextAs(browser, 'secretary');
    const doctor = await doctorCtx.newPage();
    const sec = await secCtx.newPage();
    await openDay(doctor, SAT);
    await openDay(sec, SAT);

    await slot(sec, SAT, '16:00').click(); // secretary starts typing…
    await sec.getByLabel('نام بیمار').fill('بیمار منشی');
    await sec.getByLabel('شماره موبایل').fill('09350000000');
    await book(doctor, SAT, '16:00', 'بیمار دکتر', '09121111111'); // …the doctor saves first
    await sec.getByRole('button', { name: 'ذخیره نوبت' }).click();

    await expect(sec.locator('.alert[role="alert"]')).toContainText(`توسط ${E2E_NAMES.doctor} برای «بیمار دکتر» رزرو شد`);
    await sec.getByRole('button', { name: 'انتخاب ساعت دیگر' }).click();
    await sec.getByRole('dialog').getByRole('button', { name: '۱۶:۳۰', exact: true }).click();
    await sec.getByRole('button', { name: 'انتخاب ساعت ۱۶:۳۰' }).click();
    await sec.getByRole('button', { name: 'ذخیره نوبت' }).click();
    await expect(slot(sec, SAT, '16:30')).toContainText('بیمار منشی');
    await expect(slot(sec, SAT, '16:00')).toContainText('بیمار دکتر');
    await doctorCtx.close();
    await secCtx.close();
  });

  test('an edit made on a stale screen shows the fresh data and who changed it', async ({ browser }) => {
    const doctorCtx = await contextAs(browser, 'doctor');
    const secCtx = await contextAs(browser, 'secretary');
    const doctor = await doctorCtx.newPage();
    const sec = await secCtx.newPage();
    await openDay(sec, SAT);
    await book(sec, SAT, '17:00', 'نام اول', '09121234567');
    await openDay(doctor, SAT);

    await sec.locator(`[data-slot="${slotIso(SAT, '17:00')}"]`).getByRole('button').click(); // stale form open
    await doctor.locator(`[data-slot="${slotIso(SAT, '17:00')}"]`).getByRole('button').click();
    await doctor.getByLabel('نام بیمار').fill('نام دکتر');
    await doctor.getByRole('button', { name: 'ذخیره تغییرات' }).click();
    await expect(slot(doctor, SAT, '17:00')).toContainText('نام دکتر');

    await sec.getByLabel('نام بیمار').fill('نام منشی');
    await sec.getByRole('button', { name: 'ذخیره تغییرات' }).click();
    await expect(sec.locator('.alert[role="alert"]')).toContainText(`این نوبت همین الان توسط ${E2E_NAMES.doctor} تغییر کرده است`);
    await expect(sec.getByLabel('نام بیمار')).toHaveValue('نام دکتر'); // fresh data in the form
    await expect(slot(sec, SAT, '17:00')).toContainText('نام دکتر'); // and in the list
    await doctorCtx.close();
    await secCtx.close();
  });
});

test.describe('connection', () => {
  test.use({ storageState: AUTH.secretary });

  test('offline: status says so and booking is disabled; back online it recovers', async ({ page, context }) => {
    await openDay(page, SAT);
    await context.setOffline(true);
    await expect(page.getByTestId('connection')).toHaveText('قطع');
    await expect(page.locator('.banner[role="alert"]', { hasText: 'اینترنت قطع است' })).toBeVisible();
    await expect(slot(page, SAT, '14:00')).toBeDisabled();
    await context.setOffline(false);
    await expect(page.getByTestId('connection')).toHaveText('آنلاین');
    await expect(slot(page, SAT, '14:00')).toBeEnabled();
  });
});
