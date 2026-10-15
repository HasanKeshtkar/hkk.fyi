const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function toEnglishDigits(input: string): string {
  let out = '';
  for (const ch of input) {
    const p = PERSIAN_DIGITS.indexOf(ch);
    if (p !== -1) {
      out += String(p);
      continue;
    }
    const a = ARABIC_DIGITS.indexOf(ch);
    out += a !== -1 ? String(a) : ch;
  }
  return out;
}

// Whitespace, dashes, dots, parentheses and the invisible direction marks phones insert on paste.
const PHONE_SEPARATORS = /[\s\-.()‌‎‏‪-‮⁦-⁩]/g;

/**
 * Normalizes an Iranian mobile number to 09xxxxxxxxx, or returns null if it is not one.
 * Accepts Persian/Arabic digits and the +98 / 0098 / 98 / bare-9 prefixes.
 */
export function normalizeIranMobile(input: string): string | null {
  let s = toEnglishDigits(input).replace(PHONE_SEPARATORS, '');
  if (s.startsWith('+98')) s = '0' + s.slice(3);
  else if (s.startsWith('0098')) s = '0' + s.slice(4);
  else if (s.startsWith('98') && s.length === 12) s = '0' + s.slice(2);
  else if (s.startsWith('9') && s.length === 10) s = '0' + s;
  return /^09\d{9}$/.test(s) ? s : null;
}
