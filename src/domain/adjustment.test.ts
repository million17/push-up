import { describe, expect, it } from 'vitest';
import { emptyData } from '../persistence/repository';
import {
  adjustmentDecision,
  calculateWorkoutAdjustment,
  effectivePlanDay,
  isAdjusted,
  recommendAdjustment,
  toAdjustment,
} from './adjustment';
import { DEFAULT_PLAN } from './defaultPlan';
import { getPlanDay } from './plan';
import { isDayCompleted } from './schedule';
import type { AppData, Difficulty, SetsReps, WorkoutLog } from './types';

const plan = (sets: number, reps: number): SetsReps => ({ sets, reps });
const adjust = (planned: SetsReps, actualReps: number, next: SetsReps, difficulty?: Difficulty) =>
  calculateWorkoutAdjustment({ planned, actualReps, next, difficulty });

describe('calculateWorkoutAdjustment — feedback', () => {
  it('Easy → small increase (+1 rep per set)', () => {
    const r = adjust(plan(4, 10), 40, plan(4, 10), 'easy');
    expect(r.direction).toBe('increase');
    expect(r.recommended).toEqual(plan(4, 11));
    expect(r.reason).toBe('easy');
  });

  it('Good → keeps the progression', () => {
    expect(adjust(plan(4, 10), 40, plan(3, 15), 'good').recommended).toBeNull();
  });

  it('Hard → eases a harder next workout, holds an easier one', () => {
    expect(adjust(plan(4, 10), 40, plan(3, 15), 'hard')).toMatchObject({ direction: 'ease', recommended: plan(3, 14) });
    expect(adjust(plan(4, 10), 40, plan(3, 10), 'hard').recommended).toBeNull();
  });

  it('Very hard → reduces volume', () => {
    const r = adjust(plan(5, 12), 60, plan(5, 12), 'very_hard');
    expect(r).toMatchObject({ direction: 'decrease', reason: 'very_hard', recommended: plan(4, 10) });
  });
});

describe('calculateWorkoutAdjustment — completion', () => {
  it('≥ 90% → keep (or a small increase when easy)', () => {
    expect(adjust(plan(5, 10), 48, plan(5, 11)).recommended).toBeNull();
    expect(adjust(plan(5, 10), 45, plan(5, 11), 'easy').recommended).toEqual(plan(5, 12));
  });

  it('75–89% → hold the level, never a big cut', () => {
    const r = adjust(plan(5, 10), 40, plan(5, 12));
    expect(r).toMatchObject({ direction: 'ease', reason: 'partial_completion', recommended: plan(5, 11) });
    expect(adjust(plan(5, 10), 40, plan(5, 12), 'easy').recommended).toBeNull();
  });

  it('< 75% → adjusts down moderately: 5 × 15 with 15/15/10/5/0 → 4 × 12, not 2 × 5', () => {
    const r = adjust(plan(5, 15), 15 + 15 + 10 + 5 + 0, plan(5, 15));
    expect(r.completion).toBeCloseTo(0.6);
    expect(r).toMatchObject({ direction: 'decrease', reason: 'low_completion', recommended: plan(4, 12) });
  });

  it('0 reps → decrease, with floors on sets and reps', () => {
    expect(adjust(plan(5, 10), 0, plan(2, 2)).recommended).toBeNull();
    expect(adjust(plan(5, 10), 0, plan(2, 20)).recommended).toEqual(plan(2, 16));
    expect(adjust(plan(5, 10), 0, plan(3, 2)).recommended).toEqual(plan(2, 2));
  });

  it('more than planned → completion over 100%, no penalty', () => {
    const r = adjust(plan(4, 10), 50, plan(4, 10));
    expect(r.completion).toBeCloseTo(1.25);
    expect(r.recommended).toBeNull();
  });
});

// Day 11 = 5 × 8, Day 12 = 4 × 10, Day 13 = 3 × 10, Day 14 rest, Day 15 test.
const log = (day: number, sets: number[], extra: Partial<WorkoutLog> = {}): WorkoutLog => ({
  id: `log-${day}-${sets.join('-')}`,
  day,
  date: '2026-10-11',
  startedAt: 0,
  finishedAt: 0,
  durationSec: 600,
  sets,
  totalReps: sets.reduce((a, b) => a + b, 0),
  ...extra,
});

function data(logs: WorkoutLog[], extra: Partial<AppData> = {}): AppData {
  return {
    ...emptyData(),
    profile: { initialMax: 10, goal: 50, startDate: '2026-10-01' },
    plan: [...DEFAULT_PLAN],
    workoutLogs: logs,
    ...extra,
  };
}

describe('recommendation on saved data', () => {
  it('targets the next workout and needs confirmation before anything changes', () => {
    const d = data([log(11, [8, 8, 5, 4, 3], { planned: plan(5, 8) })]);
    const rec = recommendAdjustment(d, 'log-11-8-8-5-4-3')!;
    expect(rec).toMatchObject({ targetDay: 12, original: plan(4, 10), recommended: plan(3, 8), reason: 'low_completion' });
    // Not applied yet → plan unchanged.
    expect(effectivePlanDay(d, 12)).toMatchObject(plan(4, 10));
  });

  it('applying overrides only that day; the base plan is untouched', () => {
    const d = data([log(11, [8, 8, 5, 4, 3])]);
    const rec = recommendAdjustment(d, 'log-11-8-8-5-4-3')!;
    const applied: AppData = { ...d, adjustments: [toAdjustment(rec, true, 'a1', 1)] };
    expect(effectivePlanDay(applied, 12)).toMatchObject({ day: 12, type: 'workout', ...plan(3, 8), restSeconds: 90 });
    expect(getPlanDay(applied.plan, 12)).toMatchObject(plan(4, 10));
    expect(isAdjusted(applied, 12)).toBe(true);
    expect(isAdjusted(applied, 13)).toBe(false);
    // Decided once → no second recommendation for the same workout.
    expect(recommendAdjustment(applied, 'log-11-8-8-5-4-3')).toBeNull();
    expect(adjustmentDecision(applied, 'log-11-8-8-5-4-3')?.applied).toBe(true);
  });

  it('"Keep plan" is recorded but changes nothing', () => {
    const d = data([log(11, [8, 8, 5, 4, 3])]);
    const rec = recommendAdjustment(d, 'log-11-8-8-5-4-3')!;
    const kept: AppData = { ...d, adjustments: [toAdjustment(rec, false, 'a1', 1)] };
    expect(effectivePlanDay(kept, 12)).toMatchObject(plan(4, 10));
    expect(kept.adjustments[0]).toMatchObject({ day: 12, sourceDay: 11, applied: false, reason: 'low_completion' });
  });

  it('never adjusts a Max Test, a completed day or a session in progress', () => {
    // Day 13 → next training day is the Day 15 test.
    expect(recommendAdjustment(data([log(13, [3, 3, 3])]), 'log-13-3-3-3')).toBeNull();
    // Day 12 already done → history is not rewritten.
    expect(recommendAdjustment(data([log(11, [2, 2, 2, 2, 2]), log(12, [10, 10, 10, 10])]), 'log-11-2-2-2-2-2')).toBeNull();
    const running = data([log(11, [2, 2, 2, 2, 2])], {
      activeWorkout: { day: 12, sets: 4, reps: 10, startedAt: 0, pausedMs: 0, lastActiveAt: 0, completedSets: [], phase: 'set', rest: null },
    });
    expect(recommendAdjustment(running, 'log-11-2-2-2-2-2')).toBeNull();
  });

  it('only the latest attempt of a day can recommend (no duplicates when trained twice)', () => {
    const first = log(11, [2, 2, 2, 2, 2]);
    const second = log(11, [8, 8, 8, 8, 8]);
    const d = data([first, second]);
    expect(recommendAdjustment(d, first.id)).toBeNull();
    expect(recommendAdjustment(d, second.id)).toBeNull(); // 100%, no feedback → keep
    expect(recommendAdjustment(data([first, { ...second, difficulty: 'easy' }]), second.id)?.recommended).toEqual(plan(4, 11));
  });

  it('a later applied decision for the same day wins', () => {
    const d = data([log(11, [8, 8, 8, 8, 8], { difficulty: 'easy' })]);
    const rec = recommendAdjustment(d, 'log-11-8-8-8-8-8')!;
    const a = toAdjustment(rec, true, 'a1', 1);
    const b = { ...a, id: 'a2', adjustedPlan: plan(3, 9) };
    expect(effectivePlanDay({ ...d, adjustments: [a, b] }, 12)).toMatchObject(plan(3, 9));
  });

  it('a 0-rep workout is logged but does not complete the day', () => {
    const d = data([log(12, [0, 0, 0, 0])]);
    expect(isDayCompleted(d, DEFAULT_PLAN[11])).toBe(false);
  });
});
