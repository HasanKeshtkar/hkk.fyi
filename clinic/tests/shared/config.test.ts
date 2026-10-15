import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/server/config.js';

const base = { DATABASE_URL: 'postgres://x/y' };

describe('loadConfig', () => {
  it('takes the domain only from APP_ORIGIN and locks the cookie to it over HTTPS', () => {
    const c = loadConfig({ ...base, APP_ORIGIN: 'https://clinic.hkk.fyi' });
    expect(c.origins).toEqual(['https://clinic.hkk.fyi']);
    expect(c).toMatchObject({ cookieName: '__Host-sid', cookieSecure: true, trustProxyHops: 0, port: 3000 });
  });

  it('accepts several origins for a domain move, the first being canonical', () => {
    const c = loadConfig({ ...base, APP_ORIGIN: 'https://clinic.example.ir, https://clinic.hkk.fyi/' });
    expect(c.origins).toEqual(['https://clinic.example.ir', 'https://clinic.hkk.fyi']);
  });

  it('allows http only for localhost with Secure cookies, else a plain cookie', () => {
    expect(loadConfig({ ...base, APP_ORIGIN: 'http://localhost:3000' })).toMatchObject({ cookieSecure: true });
    expect(loadConfig({ ...base, APP_ORIGIN: 'http://192.168.1.5:3000' })).toMatchObject({
      cookieSecure: false,
      cookieName: 'sid',
    });
  });

  it.each(['', 'clinic.hkk.fyi', 'https://clinic.hkk.fyi/app', 'ftp://clinic.hkk.fyi'])('rejects APP_ORIGIN=%j', (o) => {
    expect(() => loadConfig({ ...base, APP_ORIGIN: o })).toThrow();
  });

  it('has no default domain', () => {
    expect(() => loadConfig({ ...base })).toThrow();
  });
});
