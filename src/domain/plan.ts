import { DEFAULT_PLAN, DEFAULT_PLAN_BASE_MAX, DEFAULT_REST_SECONDS } from './defaultPlan';
import type { PlanDay, Settings, WorkoutPlanDay } from './types';

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
const MIN_REPS = 2;

/**
 * Builds a 30-day plan for the user's starting max by scaling the default
 * plan's reps. Max ≈ 10 returns the default plan unchanged.
 */
export function generatePlan(initialMax: number, template: readonly PlanDay[] = DEFAULT_PLAN): PlanDay[] {
  const scale = clamp(initialMax / DEFAULT_PLAN_BASE_MAX, MIN_SCALE, MAX_SCALE);
  return template.map((d) =>
    d.type === 'workout' ? { ...d, reps: Math.max(MIN_REPS, Math.round(d.reps * scale)) } : { ...d },
  );
}

export function getPlanDay(plan: readonly PlanDay[], day: number): PlanDay | undefined {
  return plan.find((d) => d.day === day);
}

export function planLength(plan: readonly PlanDay[]): number {
  return plan.length;
}

export function totalTargetReps(d: WorkoutPlanDay): number {
  return d.sets * d.reps;
}

export function restSecondsFor(d: WorkoutPlanDay, settings: Settings): number {
  return settings.restSeconds ?? d.restSeconds ?? DEFAULT_REST_SECONDS;
}

export function isTrainingDay(d: PlanDay): boolean {
  return d.type !== 'rest';
}

export function formatWorkout(d: WorkoutPlanDay): string {
  return `${d.sets} × ${d.reps}`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Rough timing used for the "~10 min" estimate. Not meant to be exact. */
const WARM_UP_SEC = 120;
const SEC_PER_REP = 3;
const SET_SETUP_SEC = 10;

/** Warm-up + every set + a rest between sets (none after the last). */
export function estimateWorkoutSec(d: WorkoutPlanDay, restSeconds: number): number {
  return WARM_UP_SEC + d.sets * (d.reps * SEC_PER_REP + SET_SETUP_SEC) + Math.max(0, d.sets - 1) * restSeconds;
}

/** Estimated duration in whole minutes (rounded up), using the user's rest time. */
export function estimateWorkoutMinutes(d: WorkoutPlanDay, settings: Settings): number {
  return Math.ceil(estimateWorkoutSec(d, restSecondsFor(d, settings)) / 60);
}
