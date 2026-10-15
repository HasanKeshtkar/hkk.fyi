import { describe, expect, it } from 'vitest';
import { normalizeIranMobile, toEnglishDigits } from '../../src/shared/phone.js';

describe('toEnglishDigits', () => {
  it('converts Persian and Arabic-Indic digits', () => {
    expect(toEnglishDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
    expect(toEnglishDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
    expect(toEnglishDigits('a۱b٢c3')).toBe('a1b2c3');
  });
});

describe('normalizeIranMobile', () => {
  it.each([
    ['09121234567', '09121234567'],
    ['۰۹۱۲۱۲۳۴۵۶۷', '09121234567'],
    ['٠٩١٢١٢٣٤٥٦٧', '09121234567'],
    ['۰۹۱۲۱۲3۴۵۶۷', '09121234567'],
    ['+989121234567', '09121234567'],
    ['+98 912 123 4567', '09121234567'],
    ['00989121234567', '09121234567'],
    ['989121234567', '09121234567'],
    ['9121234567', '09121234567'],
    ['0912 123 4567', '09121234567'],
    ['0912-123-4567', '09121234567'],
    ['(0912) 123.4567', '09121234567'],
    ['‎09121234567‏', '09121234567'],
    ['  09901234567  ', '09901234567'],
  ])('accepts %j', (input, expected) => {
    expect(normalizeIranMobile(input)).toBe(expected);
  });

  it.each([
    '',
    'abc',
    '02112345678', // landline
    '+982112345678', // landline with country code
    '0912123456', // too short
    '091212345678', // too long
    '08121234567',
    '98912345678', // 98 prefix with a digit missing
    '09١٢-abc-4567',
  ])('rejects %j', (input) => {
    expect(normalizeIranMobile(input)).toBeNull();
  });
});
