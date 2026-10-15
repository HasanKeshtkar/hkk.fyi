function requireTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error('TEST_DATABASE_URL is not set (put it in .env or the environment; see .env.example)');
  }
  return url;
}

export const TEST_DATABASE_URL = requireTestDatabaseUrl();

/** The test run wipes this database, so refuse anything not explicitly named *_test. */
export function assertTestDatabase(url: string): void {
  const name = new URL(url).pathname.replace(/^\//, '');
  if (!name.endsWith('_test')) {
    throw new Error(`refusing to run tests against database "${name}": its name must end in _test`);
  }
}
