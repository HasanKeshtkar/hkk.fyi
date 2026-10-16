// Phase 4: changes appear live on the other phone, the secretary is notified of the doctor's
// changes, and a phone that was cut off shows exactly the server's data once it is back.
import { expect, test, type Page } from '@playwright/test';
import { E2E_NAMES, E2E_ORIGIN } from './env';
import { book, closeDb, contextAs, nextWeekday, openDay, resetData, slot, slotIso } from './helpers';

const SAT = nextWeekday(6);

test.beforeEach(async () => {
  await resetData();
});
test.afterAll(async () => {
  await closeDb();
});

async function api(page: Page, method: 'POST' | 'PATCH' | 'PUT', path: string, data: unknown) {
  const res = await page.request.fetch(path, { method, data, headers: { origin: E2E_ORIGIN } });
  expect(res.ok(), `${method} ${path} → ${res.status()}`).toBe(true);
  return res.json();
}

test('the doctor’s booking appears on the secretary’s phone at once, with a notification', async ({ browser }) => {
  const doctorCtx = await contextAs(browser, 'doctor');
  const secCtx = await contextAs(browser, 'secretary');
  const doctor = await doctorCtx.newPage();
  const sec = await secCtx.newPage();
  await openDay(doctor, SAT);
  await openDay(sec, SAT);
  await expect(doctor.getByTestId('bell')).toHaveCount(0); // the doctor is not notified
  await expect(sec.getByTestId('bell')).toBeVisible();

  await book(doctor, SAT, '15:00', 'مریم احمدی', '09121234567');
  await expect(slot(sec, SAT, '15:00')).toContainText('مریم احمدی', { timeout: 3000 }); // no reload
  await expect(sec.locator('.toast')).toContainText(`${E2E_NAMES.doctor}: نوبت جدید — مریم احمدی`);
  await expect(sec.getByTestId('bell')).toContainText('۱');

  // The list explains it; tapping it marks it read.
  await sec.getByTestId('bell').click();
  const sheet = sec.getByRole('dialog', { name: /اعلان‌ها/ });
  await expect(sheet).toContainText('نوبت جدید');
  await expect(sheet).toContainText('مریم احمدی');
  await sheet.getByRole('button', { name: /نوبت جدید/ }).click();
  await expect(sec.getByRole('dialog')).toHaveCount(0);
  await expect(sec.getByTestId('bell').locator('.badge')).toHaveCount(0);
  await expect(sec).toHaveURL(new RegExp(`d=${SAT}`));
  await doctorCtx.close();
  await secCtx.close();
});

test('the secretary’s own changes notify no one, but still appear live for the doctor', async ({ browser }) => {
  const doctorCtx = await contextAs(browser, 'doctor');
  const secCtx = await contextAs(browser, 'secretary');
  const doctor = await doctorCtx.newPage();
  const sec = await secCtx.newPage();
  await openDay(doctor, SAT);
  await openDay(sec, SAT);
  await book(sec, SAT, '14:00', 'علی', '09121234567');
  await expect(slot(doctor, SAT, '14:00')).toContainText('علی', { timeout: 3000 });
  await sec.waitForTimeout(500);
  await expect(sec.getByTestId('bell').locator('.badge')).toHaveCount(0);
  await doctorCtx.close();
  await secCtx.close();
});

test('a phone cut off while changes happen shows the server’s data once it is back, missed notifications included', async ({ browser }) => {
  const doctorCtx = await contextAs(browser, 'doctor');
  const secCtx = await contextAs(browser, 'secretary');
  const doctor = await doctorCtx.newPage();
  const sec = await secCtx.newPage();
  await openDay(doctor, SAT);
  const kept = await api(doctor, 'POST', '/api/appointments', { startAt: slotIso(SAT, '14:00'), patientName: 'می‌ماند', patientPhone: '09121234567' });
  const gone = await api(doctor, 'POST', '/api/appointments', { startAt: slotIso(SAT, '14:30'), patientName: 'لغو می‌شود', patientPhone: '09121234567' });
  const moved = await api(doctor, 'POST', '/api/appointments', { startAt: slotIso(SAT, '15:00'), patientName: 'جابه‌جا می‌شود', patientPhone: '09121234567' });
  await openDay(sec, SAT);
  await sec.getByTestId('bell').click();
  await sec.getByRole('button', { name: 'همه را خواندم' }).click();
  await sec.getByRole('button', { name: 'بستن' }).click();

  await secCtx.setOffline(true);
  await expect(sec.getByTestId('connection')).toHaveText('قطع');
  await api(doctor, 'POST', `/api/appointments/${gone.id}/cancel`, { version: 1 });
  await api(doctor, 'PATCH', `/api/appointments/${moved.id}`, { version: 1, startAt: slotIso(SAT, '17:30') });
  await api(doctor, 'PATCH', `/api/appointments/${kept.id}`, { version: 1, patientName: 'می‌ماند (ویرایش)' });
  await api(doctor, 'POST', '/api/appointments', { startAt: slotIso(SAT, '18:00'), patientName: 'در غیاب', patientPhone: '09121234567' });
  await expect(slot(sec, SAT, '14:30')).toContainText('لغو می‌شود'); // still the old picture while cut off

  await secCtx.setOffline(false);
  await expect(sec.getByTestId('connection')).toHaveText('آنلاین', { timeout: 15_000 });
  await expect(slot(sec, SAT, '14:00')).toContainText('می‌ماند (ویرایش)');
  await expect(slot(sec, SAT, '14:30')).toContainText('خالی');
  await expect(slot(sec, SAT, '15:00')).toContainText('خالی');
  await expect(slot(sec, SAT, '17:30')).toContainText('جابه‌جا می‌شود');
  await expect(slot(sec, SAT, '18:00')).toContainText('در غیاب');
  await expect(sec.getByTestId('bell')).toContainText('۴'); // four changes by the doctor while away
  await doctorCtx.close();
  await secCtx.close();
});

test('a working-hours change shows up live on the day view', async ({ browser }) => {
  const doctorCtx = await contextAs(browser, 'doctor');
  const secCtx = await contextAs(browser, 'secretary');
  const doctor = await doctorCtx.newPage();
  const sec = await secCtx.newPage();
  await openDay(sec, SAT);
  await expect(sec.locator('[data-slot]')).toHaveCount(10);
  await doctor.goto('/');
  await api(doctor, 'PUT', '/api/schedule/weekly/6', { isOpen: true, startTime: '14:00', endTime: '17:00', version: 1 });
  await expect(sec.locator('[data-slot]')).toHaveCount(6, { timeout: 3000 });
  await doctorCtx.close();
  await secCtx.close();
});

test('reading the notifications on one phone clears the badge on the secretary’s other phone', async ({ browser }) => {
  const doctorCtx = await contextAs(browser, 'doctor');
  const phoneA = await contextAs(browser, 'secretary');
  const phoneB = await contextAs(browser, 'secretary');
  const doctor = await doctorCtx.newPage();
  const a = await phoneA.newPage();
  const b = await phoneB.newPage();
  await openDay(a, SAT);
  await openDay(b, SAT);
  await doctor.goto('/');
  await api(doctor, 'POST', '/api/appointments', { startAt: slotIso(SAT, '16:00'), patientName: 'زهرا', patientPhone: '09121234567' });
  await expect(a.getByTestId('bell')).toContainText('۱');
  await expect(b.getByTestId('bell')).toContainText('۱');
  await a.getByTestId('bell').click();
  await a.getByRole('button', { name: 'همه را خواندم' }).click();
  await expect(b.getByTestId('bell').locator('.badge')).toHaveCount(0, { timeout: 3000 });
  await doctorCtx.close();
  await phoneA.close();
  await phoneB.close();
});
