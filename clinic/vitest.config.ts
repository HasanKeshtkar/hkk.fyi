import { defineConfig } from 'vitest/config';
import { loadDotEnv } from './src/server/env-file.js';

loadDotEnv();

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globalSetup: './tests/global-setup.ts',
    // DB tests share one database; run files one after another.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
