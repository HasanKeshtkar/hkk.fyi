import { expect, test as setup } from '@playwright/test';
import { E2E_PASSWORDS } from './env';
import { AUTH } from './helpers';

for (const role of ['doctor', 'secretary'] as const) {
  setup(`sign in as ${role}`, async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/login/');
    await page.getByRole('button', { name: role === 'doctor' ? 'دکتر' : 'منشی' }).click();
    await page.getByLabel('رمز عبور').fill(E2E_PASSWORDS[role]);
    await page.getByRole('button', { name: 'ورود' }).click();
    await page.waitForURL((u) => u.pathname === '/');
    await expect(page.getByTestId('connection')).toHaveText('آنلاین');
    await page.context().storageState({ path: AUTH[role] });
  });
}
