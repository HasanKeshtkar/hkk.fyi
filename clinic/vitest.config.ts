import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // The app runs once, on the real Workers runtime (wrangler dev); see tests/worker-setup.ts.
    globalSetup: './tests/worker-setup.ts',
    // Tests share that one instance and reset its data: run files one after another.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
