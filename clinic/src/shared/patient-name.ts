export const PATIENT_NAME_MAX = 100;

// Direction marks, zero-width space/joiner and BOM that sneak in on copy/paste.
// ZWNJ (‌) is kept: it is part of Persian spelling ("محمد‌رضا").
const INVISIBLE = /[​‎‏‪-‮⁠⁦-⁩﻿]/g;
// Control characters other than the tab/newline/CR that the whitespace collapse turns into spaces.
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/;

/**
 * Trims, collapses inner whitespace, unifies Arabic ي/ك/ى to Persian ی/ک.
 * Returns null when the input holds control characters, has no visible letter or digit,
 * or is longer than PATIENT_NAME_MAX.
 */
export function normalizePatientName(input: string): string | null {
  if (CONTROL.test(input)) return null;
  const s = input
    .replace(INVISIBLE, '')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\s+/g, ' ')
    .trim();
  if (!/[\p{L}\p{N}]/u.test(s) || s.length > PATIENT_NAME_MAX) return null;
  return s;
}
