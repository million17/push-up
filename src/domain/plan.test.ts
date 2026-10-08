import { describe, expect, it } from 'vitest';
import { DEFAULT_PLAN } from './defaultPlan';
import { estimateWorkoutMinutes, generatePlan, getPlanDay, restSecondsFor } from './plan';
import type { WorkoutPlanDay } from './types';
import { DEFAULT_SETTINGS } from '../persistence/repository';

describe('default plan', () => {
  it('has 30 consecutive days with tests on 15 and 30', () => {
    expect(DEFAULT_PLAN.map((d) => d.day)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    expect(DEFAULT_PLAN.filter((d) => d.type === 'test').map((d) => d.day)).toEqual([15, 30]);
    expect(DEFAULT_PLAN.filter((d) => d.type === 'rest').map((d) => d.day)).toEqual([3, 7, 10, 14, 16, 20, 23, 26, 29]);
  });
});

describe('generatePlan', () => {
  it('returns the default plan for max 10', () => {
    expect(generatePlan(10)).toEqual(DEFAULT_PLAN);
  });

  it('makes the plan easier for max 5 and harder for max 20', () => {
    const day12 = (max: number) => getPlanDay(generatePlan(max), 12) as WorkoutPlanDay;
    expect(day12(5).reps).toBe(5);
    expect(day12(10).reps).toBe(10);
    expect(day12(20).reps).toBe(20);
    expect(day12(5).sets).toBe(4);
  });

  it('never goes below 2 reps and keeps rest/test days', () => {
    const plan = generatePlan(1);
    expect(plan.every((d) => d.type !== 'workout' || d.reps >= 2)).toBe(true);
    expect(getPlanDay(plan, 3)?.type).toBe('rest');
    expect(getPlanDay(plan, 15)?.type).toBe('test');
  });

  it('does not mutate the template', () => {
    generatePlan(25);
    expect((DEFAULT_PLAN[0] as WorkoutPlanDay).reps).toBe(5);
  });
});

describe('restSecondsFor', () => {
  const day = DEFAULT_PLAN[0] as WorkoutPlanDay;
  it('uses the plan value unless the user overrides it', () => {
    expect(restSecondsFor(day, DEFAULT_SETTINGS)).toBe(90);
    expect(restSecondsFor(day, { ...DEFAULT_SETTINGS, restSeconds: 60 })).toBe(60);
  });
});

describe('estimateWorkoutMinutes', () => {
  const day = (sets: number, reps: number): WorkoutPlanDay => ({ day: 1, type: 'workout', sets, reps, restSeconds: 90 });
  it('lands in the 10–20 minute range for typical days', () => {
    expect(estimateWorkoutMinutes(day(4, 10), DEFAULT_SETTINGS)).toBe(10);
    expect(estimateWorkoutMinutes(day(5, 10), DEFAULT_SETTINGS)).toBe(12);
    expect(estimateWorkoutMinutes(day(4, 15), DEFAULT_SETTINGS)).toBe(11);
  });

  it('gets shorter with a shorter rest time', () => {
    expect(estimateWorkoutMinutes(day(5, 10), { ...DEFAULT_SETTINGS, restSeconds: 30 })).toBe(8);
  });
});
