import { activeElapsedMs, touch } from './activity';
import { dateKeyFromMs } from './dates';
import type { ActiveTest, TestResult } from './types';

export function startTest(day: number, now: number): ActiveTest {
  return { day, startedAt: now, pausedMs: 0, lastActiveAt: now, reps: 0 };
}

export function addReps(s: ActiveTest, delta: number, now: number): ActiveTest {
  return touch({ ...s, reps: Math.max(0, s.reps + delta) }, now);
}

export function testElapsedMs(s: ActiveTest, now: number): number {
  return activeElapsedMs(s, now);
}

export function finishTest(s: ActiveTest, previousBest: number, now: number, id: string): TestResult {
  return {
    id,
    day: s.day,
    date: dateKeyFromMs(now),
    reps: s.reps,
    durationSec: Math.round(testElapsedMs(s, now) / 1000),
    previousBest,
  };
}

export interface Improvement {
  from: number;
  to: number;
  diff: number;
  /** null when there is no baseline to compare against. */
  percent: number | null;
}

export function improvement(from: number, to: number): Improvement {
  return {
    from,
    to,
    diff: to - from,
    percent: from > 0 ? Math.round(((to - from) / from) * 1000) / 10 : null,
  };
}
