import { isDayCompleted } from './schedule';
import type { AppData } from './types';

export interface Streak {
  current: number;
  longest: number;
}

/**
 * Walks training days (workout + test) up to today.
 * - Rest days are skipped and never break the streak.
 * - A completed training day adds 1.
 * - A past training day that is not completed resets the streak.
 * - Today not done yet does not break it (there is still time).
 */
export function computeStreak(data: AppData, todayDay: number): Streak {
  let current = 0;
  let longest = 0;
  for (const d of data.plan) {
    if (d.day > todayDay) break;
    if (d.type === 'rest') continue;
    if (isDayCompleted(data, d)) {
      current += 1;
      longest = Math.max(longest, current);
    } else if (d.day < todayDay) {
      current = 0;
    }
  }
  return { current, longest };
}

export function completedTrainingDays(data: AppData): number {
  return data.plan.filter((d) => d.type !== 'rest' && isDayCompleted(data, d)).length;
}

export function trainingDayCount(data: AppData): number {
  return data.plan.filter((d) => d.type !== 'rest').length;
}

export function totalReps(data: AppData): number {
  return (
    data.workoutLogs.reduce((sum, l) => sum + l.totalReps, 0) +
    data.testResults.reduce((sum, r) => sum + r.reps, 0)
  );
}

export function bestMax(data: AppData): number {
  return Math.max(data.profile?.initialMax ?? 0, ...data.testResults.map((r) => r.reps));
}

/** Percentage of the challenge's days that have elapsed or been completed. */
export function challengeProgress(data: AppData, todayDay: number): number {
  const total = data.plan.length;
  if (!total) return 0;
  const done = data.plan.filter((d) => d.day < todayDay || isDayCompleted(data, d)).length;
  return Math.min(1, done / total);
}
