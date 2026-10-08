import type { Settings, TimeOfDay } from './types';

/** The one place the default 06:30 lives. */
export const DEFAULT_WORKOUT_TIME: TimeOfDay = { hour: 6, minute: 30 };

/** Quick picks in Settings (anything else is "Custom"). */
export const WORKOUT_TIME_PRESETS: readonly TimeOfDay[] = [
  { hour: 6, minute: 0 },
  DEFAULT_WORKOUT_TIME,
  { hour: 7, minute: 0 },
];

export function workoutTime(settings: Settings): TimeOfDay {
  return { hour: settings.reminder.hour, minute: settings.reminder.minute };
}

export function minutesOfDay(t: TimeOfDay): number {
  return t.hour * 60 + t.minute;
}

export function sameTime(a: TimeOfDay, b: TimeOfDay): boolean {
  return a.hour === b.hour && a.minute === b.minute;
}

/** "HH:MM", e.g. for `<input type="time">`. */
export function toHHMM(t: TimeOfDay): string {
  return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
}

export function parseHHMM(value: string): TimeOfDay | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  return hour < 24 && minute < 60 ? { hour, minute } : null;
}

/** Has today's workout time passed at `nowMs` (local time)? */
export function isPastWorkoutTime(t: TimeOfDay, nowMs: number): boolean {
  const d = new Date(nowMs);
  return d.getHours() * 60 + d.getMinutes() >= minutesOfDay(t);
}

export type DayPart = 'morning' | 'afternoon' | 'evening';

export function dayPart(nowMs: number): DayPart {
  const h = new Date(nowMs).getHours();
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
}
