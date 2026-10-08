import { describe, expect, it } from 'vitest';
import { emptyData } from '../persistence/repository';
import { DEFAULT_PLAN } from './defaultPlan';
import { historyEntries, maxProgressPoints, milestones, progressSummary, workoutRecords } from './progress';
import type { AppData, TestResult, WorkoutLog } from './types';

const test = (day: number, reps: number, id = `t${day}-${reps}`): TestResult => ({
  id,
  day,
  date: `2026-10-${String(day).padStart(2, '0')}`,
  reps,
  durationSec: 60,
  previousBest: 10,
});
const log = (day: number, sets: number[], extra: Partial<WorkoutLog> = {}): WorkoutLog => ({
  id: `l${day}-${sets.join('-')}`,
  day,
  date: '2026-10-12',
  startedAt: 0,
  finishedAt: 0,
  durationSec: 600,
  sets,
  totalReps: sets.reduce((a, b) => a + b, 0),
  ...extra,
});

function data(extra: Partial<AppData> = {}): AppData {
  return {
    ...emptyData(),
    profile: { initialMax: 10, goal: 50, startDate: '2026-10-01' },
    plan: [...DEFAULT_PLAN],
    ...extra,
  };
}

describe('progress chart data', () => {
  it('uses only real results: starting max + best of each test day, in day order', () => {
    const d = data({ testResults: [test(30, 42), test(15, 22), test(15, 25)] });
    expect(maxProgressPoints(d).map((p) => [p.day, p.reps, p.kind])).toEqual([
      [1, 10, 'initial'],
      [15, 25, 'test'],
      [30, 42, 'test'],
    ]);
  });

  it('no tests → only the starting point (the screen shows an empty state)', () => {
    expect(maxProgressPoints(data())).toHaveLength(1);
    expect(maxProgressPoints({ ...data(), profile: null })).toEqual([]);
  });
});

describe('progress summary', () => {
  it('current best, improvement and goal distance', () => {
    const s = progressSummary(data({ testResults: [test(15, 32)] }), 17);
    expect(s).toMatchObject({ startingMax: 10, currentBest: 32, goal: 50, toGoal: 18, hasTests: true, nextTestDay: 30 });
    expect(s.improvement).toMatchObject({ diff: 22, percent: 220 });
  });

  it('before any test: current best = starting max, next test Day 15', () => {
    expect(progressSummary(data(), 12)).toMatchObject({ currentBest: 10, hasTests: false, nextTestDay: 15, toGoal: 40 });
  });

  it('goal reached → 0 to go', () => {
    expect(progressSummary(data({ testResults: [test(30, 55)] }), 30).toGoal).toBe(0);
  });
});

describe('milestones', () => {
  it('Started, First 20, 30, 40, Goal — marked only when actually reached', () => {
    const m = milestones(data({ testResults: [test(15, 24)] }));
    expect(m.map((x) => [x.kind, x.reps, x.achieved, x.day])).toEqual([
      ['started', 10, true, 1],
      ['reps', 20, true, 15],
      ['reps', 30, false, null],
      ['reps', 40, false, null],
      ['goal', 50, false, null],
    ]);
  });

  it('scales to other starts/goals without flooding the list', () => {
    const m = milestones({ ...data(), profile: { initialMax: 3, goal: 200, startDate: '2026-10-01' } });
    expect(m.filter((x) => x.kind === 'reps').length).toBeLessThanOrEqual(4);
    expect(m.at(-1)).toMatchObject({ kind: 'goal', reps: 200 });
  });
});

describe('workout history', () => {
  it('one record per day (latest attempt) with planned vs actual', () => {
    const d = data({
      workoutLogs: [
        log(12, [10, 10, 10, 10]),
        log(12, [10, 10, 8, 7], { planned: { sets: 4, reps: 10 }, difficulty: 'hard' }),
        log(11, [8, 8, 8, 8, 8]),
      ],
    });
    const records = workoutRecords(d);
    expect(records.map((r) => r.day)).toEqual([11, 12]);
    expect(records[1]).toMatchObject({ attempts: 2, base: { sets: 4, reps: 10 }, adjusted: false });
    expect(records[1].log.totalReps).toBe(35);
    expect(records[1].completion).toBeCloseTo(0.875);
  });

  it('records the adjusted target, not the base plan', () => {
    const d = data({ workoutLogs: [log(12, [10, 10, 10, 10], { planned: { sets: 4, reps: 10 }, adjusted: true })] });
    d.plan = d.plan.map((p) => (p.day === 12 && p.type === 'workout' ? { ...p, sets: 5, reps: 12 } : p));
    expect(workoutRecords(d)[0]).toMatchObject({ base: { sets: 5, reps: 12 }, planned: { sets: 4, reps: 10 }, adjusted: true, completion: 1 });
  });

  it('newest first, with tests and past rest days, missed days left out', () => {
    const d = data({ workoutLogs: [log(1, [5, 5, 5, 5, 5]), log(2, [5, 5, 5, 5]), log(4, [6, 6, 6, 6, 6])] });
    // Day 5 missed (today = 6) → not listed.
    expect(historyEntries(d, 6).map((e) => [e.day, e.kind])).toEqual([
      [4, 'workout'],
      [3, 'rest'],
      [2, 'workout'],
      [1, 'workout'],
    ]);
    expect(historyEntries(data(), 5)).toEqual([]);
  });
});
