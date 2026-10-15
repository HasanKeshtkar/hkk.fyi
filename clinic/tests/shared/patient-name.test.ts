import { describe, expect, it } from 'vitest';
import { normalizePatientName, PATIENT_NAME_MAX } from '../../src/shared/patient-name.js';

describe('normalizePatientName', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizePatientName('  علی    رضایی \n')).toBe('علی رضایی');
  });

  it('unifies Arabic ي/ى/ك to Persian ی/ک', () => {
    expect(normalizePatientName('علي كاظمى')).toBe('علی کاظمی');
  });

  it('keeps ZWNJ inside names and drops direction marks', () => {
    expect(normalizePatientName('‏محمد‌رضا‎')).toBe('محمد‌رضا');
  });

  it('rejects control characters', () => {
    expect(normalizePatientName('مریم\u0000 احمدی')).toBeNull();
    expect(normalizePatientName('a\u0001b')).toBeNull();
    expect(normalizePatientName('علی\u007f')).toBeNull();
    expect(normalizePatientName('علی\u0085')).toBeNull();
  });

  it('turns tabs and newlines into single spaces', () => {
    expect(normalizePatientName('علی\t\r\nرضایی')).toBe('علی رضایی');
  });

  it('rejects names with no visible letter or digit', () => {
    expect(normalizePatientName('\u200c')).toBeNull(); // ZWNJ only (the half-space key)
    expect(normalizePatientName('\u200b')).toBeNull();
    expect(normalizePatientName('\u2060')).toBeNull();
    expect(normalizePatientName('- . -')).toBeNull();
  });

  it('strips zero-width space and word joiner', () => {
    expect(normalizePatientName('علی\u200bرضا\u2060')).toBe('علیرضا');
  });

  it('rejects empty and over-long names', () => {
    expect(normalizePatientName('')).toBeNull();
    expect(normalizePatientName('   ')).toBeNull();
    expect(normalizePatientName('‎')).toBeNull();
    expect(normalizePatientName('ا'.repeat(PATIENT_NAME_MAX))).toHaveLength(PATIENT_NAME_MAX);
    expect(normalizePatientName('ا'.repeat(PATIENT_NAME_MAX + 1))).toBeNull();
  });
});
