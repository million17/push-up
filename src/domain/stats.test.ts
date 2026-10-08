import { describe, expect, it } from 'vitest';
import { emptyData } from '../persistence/repository';
import { DEFAULT_PLAN } from './defaultPlan';
import { catchUpStartDate, currentDayNumber, dayStatus, missedDays } from './schedule';
import { bestMax, challengeProgress, completedTrainingDays, computeStreak, totalReps } from './stats';
import { improvement } from './testSession';
import type { AppData, WorkoutLog } from './types';

const log = (day: number, totalReps = 10): WorkoutLog => ({
  id: `l${day}-${Math.random()}`,
  day,
  date: '2026-10-08',
  startedAt: 0,
  finishedAt: 0,
  durationSec: 60,
  sets: [totalReps],
  totalReps,
});

function data(doneDays: number[], extra: Partial<AppData> = {}): AppData {
  return {
    ...emptyData(),
    profile: { initialMax: 10, goal: 50, startDate: '2026-10-01' },
    plan: [...DEFAULT_PLAN],
    workoutLogs: doneDays.map((d) => log(d)),
    ...extra,
  };
}

describe('schedule', () => {
  it('maps calendar days to plan days', () => {
    const p = data([]).profile!;
    expect(currentDayNumber(p, '2026-10-01')).toBe(1);
    expect(currentDayNumber(p, '2026-10-12')).toBe(12);
    expect(currentDayNumber(p, '2026-09-20')).toBe(1);
  });

  it('works across a DST change', () => {
    const p = { initialMax: 10, goal: 50, startDate: '2026-03-01' };
    expect(currentDayNumber(p, '2026-03-30')).toBe(30);
  });

  it('labels days', () => {
    const d = data([1, 2]);
    expect(dayStatus(d, DEFAULT_PLAN[0], 5)).toBe('completed');
    expect(dayStatus(d, DEFAULT_PLAN[2], 5)).toBe('rest');
    expect(dayStatus(d, DEFAULT_PLAN[3], 5)).toBe('missed');
    expect(dayStatus(d, DEFAULT_PLAN[4], 5)).toBe('today');
    expect(dayStatus(d, DEFAULT_PLAN[5], 5)).toBe('upcoming');
  });

  it('catch-up moves the start date so the first missed day is today', () => {
    const d = data([1, 2]);
    const missed = missedDays(d, 6);
    expect(missed.map((m) => m.day)).toEqual([4, 5]);
    const start = catchUpStartDate('2026-10-06', 4);
    expect(currentDayNumber({ ...d.profile!, startDate: start }, '2026-10-06')).toBe(4);
  });
});

describe('streak', () => {
  it('rest days do not break the streak', () => {
    // 1,2 done · 3 rest · 4,5,6 done · 7 rest · today = 8
    expect(computeStreak(data([1, 2, 4, 5, 6]), 8)).toEqual({ current: 5, longest: 5 });
  });

  it('today not done yet does not break the streak; completing it adds 1', () => {
    expect(computeStreak(data([1, 2]), 4).current).toBe(2);
    expect(computeStreak(data([1, 2, 4]), 4).current).toBe(3);
  });

  it('a missed workout day resets the current streak but keeps the longest', () => {
    expect(computeStreak(data([1, 2, 4, 5, 8, 9]), 11)).toEqual({ current: 2, longest: 4 });
  });

  it('a rest day today keeps the streak', () => {
    expect(computeStreak(data([1, 2, 4, 5, 6]), 7).current).toBe(5);
  });

  it('test days count as training days', () => {
    const d = data([11, 12, 13], {
      testResults: [{ id: 't', day: 15, date: '2026-10-15', reps: 24, durationSec: 60, previousBest: 10 }],
    });
    expect(computeStreak(d, 15).current).toBe(4);
  });
});

describe('stats', () => {
  it('counts each day once even when repeated, but sums all reps', () => {
    const d = data([1, 1, 2]);
    expect(completedTrainingDays(d)).toBe(2);
    expect(totalReps(d)).toBe(30);
  });

  it('best max takes initial and tests', () => {
    const d = data([], {
      testResults: [{ id: 't', day: 15, date: '2026-10-15', reps: 24, durationSec: 60, previousBest: 10 }],
    });
    expect(bestMax(d)).toBe(24);
    expect(bestMax(data([]))).toBe(10);
  });

  it('challenge progress', () => {
    expect(challengeProgress(data([]), 1)).toBe(0);
    expect(challengeProgress(data([1]), 1)).toBeCloseTo(1 / 30);
    expect(challengeProgress(data([]), 31)).toBe(1);
  });

  it('improvement matches the example 24 → 35', () => {
    expect(improvement(24, 35)).toEqual({ from: 24, to: 35, diff: 11, percent: 45.8 });
    expect(improvement(0, 5).percent).toBeNull();
  });
});
