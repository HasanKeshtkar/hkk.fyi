// Passwords, sessions and the login rate limit.
//
// Passwords: PBKDF2-SHA256 (Web Crypto) with a random salt. Sessions: a random 32-byte token in an
// httpOnly cookie; only its SHA-256 is stored. Sessions slide: each day of use extends them to
// 180 days from then, so a phone in daily use stays signed in.

export const SESSION_TTL_MS = 180 * 24 * 60 * 60 * 1000;
export const SESSION_REFRESH_MS = 24 * 60 * 60 * 1000;
export const PASSWORD_MIN_LENGTH = 8;
const PBKDF2_ITERATIONS = 100_000;
const TOKEN_FORMAT = /^[A-Za-z0-9_-]{43}$/;

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

/** 'pbkdf2-sha256$<iterations>$<salt>$<hash>' */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2-sha256$${PBKDF2_ITERATIONS}$${b64url(salt)}$${b64url(hash)}`;
}

/** Constant-time comparison of two equal-length byte arrays. */
function equal(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export async function verifyPassword(stored: string, password: string): Promise<boolean> {
  const [scheme, iter, salt, hash] = stored.split('$');
  if (scheme !== 'pbkdf2-sha256' || !iter || !salt || !hash) return false;
  const iterations = Number(iter);
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > 10_000_000) return false;
  try {
    return equal(await pbkdf2(password, fromB64url(salt), iterations), fromB64url(hash));
  } catch {
    return false;
  }
}

export function newToken(): string {
  return b64url(crypto.getRandomValues(new Uint8Array(32)));
}

export function isTokenFormat(token: string | undefined): token is string {
  return typeof token === 'string' && TOKEN_FORMAT.test(token);
}

export async function hashToken(token: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(token)));
  return Array.from(d, (b) => b.toString(16).padStart(2, '0')).join('');
}
