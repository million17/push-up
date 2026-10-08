import { addDays, daysBetween } from './dates';
import type { AppData, DateKey, DayStatus, PlanDay, Profile } from './types';

/** Plan day number for a calendar date. Can be < 1 or > plan length. */
export function dayNumberOn(profile: Profile, date: DateKey): number {
  return daysBetween(profile.startDate, date) + 1;
}

/** Today's plan day, never below 1. May exceed the plan length (challenge over). */
export function currentDayNumber(profile: Profile, today: DateKey): number {
  return Math.max(1, dayNumberOn(profile, today));
}

export function dateOfDay(profile: Profile, day: number): DateKey {
  return addDays(profile.startDate, day - 1);
}

export function isChallengeOver(data: AppData, today: DateKey): boolean {
  return !!data.profile && currentDayNumber(data.profile, today) > data.plan.length;
}

export function isDayCompleted(data: Pick<AppData, 'workoutLogs' | 'testResults'>, d: PlanDay): boolean {
  if (d.type === 'workout') return data.workoutLogs.some((l) => l.day === d.day);
  if (d.type === 'test') return data.testResults.some((r) => r.day === d.day);
  return false;
}

export function dayStatus(data: AppData, d: PlanDay, todayDay: number): DayStatus {
  if (isDayCompleted(data, d)) return 'completed';
  if (d.day === todayDay) return 'today';
  if (d.type === 'rest') return 'rest';
  return d.day < todayDay ? 'missed' : 'upcoming';
}

export function missedDays(data: AppData, todayDay: number): PlanDay[] {
  return data.plan.filter((d) => d.day < todayDay && d.type !== 'rest' && !isDayCompleted(data, d));
}

/** The next workout/test day after `day`, if any. */
export function nextTrainingDay(plan: readonly PlanDay[], day: number): PlanDay | undefined {
  return plan.find((d) => d.day > day && d.type !== 'rest');
}

/** Can the user start this day's session? Past and today: yes. Future: no. */
export function isDayUnlocked(day: number, todayDay: number): boolean {
  return day <= todayDay;
}

/** New start date that makes `day` fall on `today`, shifting the rest of the plan. */
export function catchUpStartDate(today: DateKey, day: number): DateKey {
  return addDays(today, -(day - 1));
}
