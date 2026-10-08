import type { DateKey } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function dateKeyFromMs(ms: number): DateKey {
  return toDateKey(new Date(ms));
}

export function parseDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Whole calendar days from a to b (DST-safe). */
export function daysBetween(a: DateKey, b: DateKey): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

export function formatLongDate(key: DateKey, locale?: string): string {
  return parseDateKey(key).toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayMondayFirst(key: DateKey): number {
  return (parseDateKey(key).getDay() + 6) % 7;
}
