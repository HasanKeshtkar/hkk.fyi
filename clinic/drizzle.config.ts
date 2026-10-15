import { defineConfig } from 'drizzle-kit';
import { loadDotEnv } from './src/server/env-file.js';

loadDotEnv();

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  strict: true,
});
