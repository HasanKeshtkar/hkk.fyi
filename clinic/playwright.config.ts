import { defineConfig } from '@playwright/test';
import { E2E_ORIGIN } from './e2e/env';

// Browser tests drive the built app (npm run build:web) on a phone-sized screen.
export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [['list']],
  use: {
    baseURL: E2E_ORIGIN,
    locale: 'fa-IR',
    timezoneId: 'Asia/Tehran',
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    trace: 'retain-on-failure',
    // Off except in the PWA tests: requests a service worker makes bypass page.route().
    serviceWorkers: 'block',
    // This container ships its own Chromium; CI installs Playwright's.
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { name: 'app', testMatch: /.*\.spec\.ts/, dependencies: ['setup'] },
  ],
  webServer: {
    command: 'npx tsx e2e/serve.ts',
    url: `${E2E_ORIGIN}/healthz`,
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: 'pipe',
  },
});
