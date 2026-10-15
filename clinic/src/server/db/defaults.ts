// Seeded once; editable afterwards from the settings screen. weekday = Date#getDay() (0 = Sunday).
export const DEFAULT_WEEKLY_SCHEDULE = [
  { weekday: 6, isOpen: true, startTime: '14:00', endTime: '19:00' }, // شنبه
  { weekday: 0, isOpen: true, startTime: '14:00', endTime: '19:00' }, // یکشنبه
  { weekday: 1, isOpen: true, startTime: '08:00', endTime: '12:00' }, // دوشنبه
  { weekday: 2, isOpen: true, startTime: '14:00', endTime: '19:00' }, // سه‌شنبه
  { weekday: 3, isOpen: true, startTime: '14:00', endTime: '19:00' }, // چهارشنبه
  { weekday: 4, isOpen: false, startTime: '14:00', endTime: '19:00' }, // پنجشنبه
  { weekday: 5, isOpen: false, startTime: '14:00', endTime: '19:00' }, // جمعه
] as const;
