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

  it('backs up daily only when BACKUP_DIR is set (default: keep 30, at 03:00 clinic time)', () => {
    const o = { ...base, APP_ORIGIN: 'https://clinic.hkk.fyi' };
    expect(loadConfig(o).backup).toBeNull();
    expect(loadConfig({ ...o, BACKUP_DIR: '/app/backups' }).backup).toEqual({ dir: '/app/backups', keep: 30, hour: 3 });
    expect(loadConfig({ ...o, BACKUP_DIR: '/b', BACKUP_KEEP: '7', BACKUP_HOUR: '23' }).backup).toEqual({ dir: '/b', keep: 7, hour: 23 });
    expect(() => loadConfig({ ...o, BACKUP_DIR: '/b', BACKUP_HOUR: '24' })).toThrow();
    expect(() => loadConfig({ ...o, BACKUP_DIR: '/b', BACKUP_KEEP: '0' })).toThrow();
  });
});
