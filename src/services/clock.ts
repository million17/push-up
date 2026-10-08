import { daysBetween, toDateKey } from '../domain/dates';
import type { DateKey } from '../domain/types';

/**
 * Single source of "now" for the app.
 * In dev, `?today=YYYY-MM-DD` shifts the clock by whole days so later days of
 * the plan (rest days, Day 15 / Day 30 tests, streaks) can be tried by hand.
 * `?today=YYYY-MM-DDTHH:MM` also sets the time of day (e.g. before/after 06:30).
 */
let offsetMs = 0;

if (import.meta.env.DEV && typeof window !== 'undefined') {
  const fake = new URLSearchParams(window.location.search).get('today');
  if (fake && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(fake)) {
    offsetMs = new Date(`${fake}:00`).getTime() - Date.now();
  } else if (fake && /^\d{4}-\d{2}-\d{2}$/.test(fake)) {
    offsetMs = daysBetween(toDateKey(new Date()), fake) * 86_400_000;
  }
}

export function now(): number {
  return Date.now() + offsetMs;
}

export function todayKey(): DateKey {
  return toDateKey(new Date(now()));
}
