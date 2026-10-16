'use client';

import { useState } from 'react';
import { clinicToday, weekdayOf, type IsoDate } from '../../shared/time';
import { fa } from '../lib/format';
import { jalaliMonthOf, shiftJalaliMonth, WEEKDAY_INITIALS } from '../lib/jalali';
import { IconChevronLeft, IconChevronRight } from './icons';

/** A Jalali month grid (Saturday first). Tapping a day calls onPick with its Gregorian ISO date. */
export function JalaliCalendar(props: { value: IsoDate; onPick: (date: IsoDate) => void }) {
  const [cursor, setCursor] = useState(props.value);
  const month = jalaliMonthOf(cursor);
  const today = clinicToday();
  return (
    <div>
      <div className="cal-head">
        <button type="button" className="nav-btn" aria-label="ماه قبل" onClick={() => setCursor(shiftJalaliMonth(cursor, -1))}>
          <IconChevronRight />
        </button>
        <span className="cal-title">{month.title}</span>
        <button type="button" className="nav-btn" aria-label="ماه بعد" onClick={() => setCursor(shiftJalaliMonth(cursor, 1))}>
          <IconChevronLeft />
        </button>
      </div>
      <div className="cal-grid">
        {WEEKDAY_INITIALS.map((w) => (
          <div key={w} className="cal-dow">
            {w}
          </div>
        ))}
        {Array.from({ length: month.leadingBlanks }, (_, i) => (
          <div key={`b${i}`} />
        ))}
        {month.days.map((d) => {
          const classes = ['cal-day'];
          if (d.date === today) classes.push('is-today');
          if (d.date === props.value) classes.push('is-selected');
          if (weekdayOf(d.date) === 5) classes.push('is-friday');
          return (
            <button
              type="button"
              key={d.date}
              className={classes.join(' ')}
              aria-pressed={d.date === props.value}
              onClick={() => props.onPick(d.date)}
            >
              {fa(d.day)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
