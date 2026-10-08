import { getPlanDay, totalTargetReps } from './plan';
import { isDayCompleted, nextTrainingDay } from './schedule';
import type {
  AdjustmentReason,
  AppData,
  Difficulty,
  PlanDay,
  SetsReps,
  WorkoutAdjustment,
  WorkoutLog,
  WorkoutPlanDay,
} from './types';

/**
 * Auto-adjust: after a workout, compare planned vs actual reps (plus the
 * optional difficulty feedback) and recommend a small change to the next
 * workout. Nothing changes until the user applies it; the base plan is never
 * modified — an applied adjustment overrides a single upcoming day.
 *
 * |            | ≥ 90 %   | 75–89 % | < 75 %   |
 * |------------|----------|---------|----------|
 * | Easy       | increase | keep    | decrease |
 * | Good / –   | keep     | ease    | decrease |
 * | Hard       | ease     | ease    | decrease |
 * | Very hard  | decrease | decrease| decrease |
 */

export const COMPLETION_HIGH = 0.9;
export const COMPLETION_LOW = 0.75;
const MIN_SETS = 2;
const MIN_REPS = 2;
/** Reps kept per set on a decrease (with one set fewer): 5 × 15 → 4 × 12. */
const DECREASE_FACTOR = 0.8;

export type AdjustmentDirection = 'increase' | 'keep' | 'ease' | 'decrease';

export interface AdjustmentInput {
  /** What the finished workout targeted. */
  planned: SetsReps;
  actualReps: number;
  difficulty?: Difficulty;
  /** The next workout as currently planned. */
  next: SetsReps;
}

export interface AdjustmentResult {
  direction: AdjustmentDirection;
  reason: AdjustmentReason | null;
  /** actual / planned; can exceed 1. */
  completion: number;
  /** null when the next workout should stay as it is. */
  recommended: SetsReps | null;
}

export function completionRate(planned: SetsReps, actualReps: number): number {
  const target = totalTargetReps(planned);
  return target > 0 ? Math.max(0, actualReps) / target : 1;
}

/** Below target or rated hard: show the supportive message (never "you failed"). */
export function isChallenging(completion: number, difficulty?: Difficulty): boolean {
  return completion < COMPLETION_HIGH || difficulty === 'hard' || difficulty === 'very_hard';
}

export function adjustmentDirection(
  completion: number,
  difficulty?: Difficulty,
): { direction: AdjustmentDirection; reason: AdjustmentReason | null } {
  if (difficulty === 'very_hard') return { direction: 'decrease', reason: 'very_hard' };
  if (completion < COMPLETION_LOW) return { direction: 'decrease', reason: 'low_completion' };
  if (completion < COMPLETION_HIGH) {
    if (difficulty === 'easy') return { direction: 'keep', reason: null };
    return { direction: 'ease', reason: difficulty === 'hard' ? 'hard' : 'partial_completion' };
  }
  if (difficulty === 'easy') return { direction: 'increase', reason: 'easy' };
  if (difficulty === 'hard') return { direction: 'ease', reason: 'hard' };
  return { direction: 'keep', reason: null };
}

/** Small steps only: never more than +1 rep per set, never a reset to a tiny workout. */
export function applyDirection(direction: AdjustmentDirection, next: SetsReps, today: SetsReps): SetsReps {
  switch (direction) {
    case 'increase':
      return { sets: next.sets, reps: next.reps + 1 };
    case 'ease':
      // Hold the level: only trim when the next workout would be bigger than today's.
      if (totalTargetReps(next) <= totalTargetReps(today)) return next;
      return { sets: next.sets, reps: Math.max(MIN_REPS, next.reps - 1) };
    case 'decrease':
      return {
        sets: Math.max(Math.min(next.sets, MIN_SETS), next.sets - 1),
        reps: Math.max(MIN_REPS, Math.round(next.reps * DECREASE_FACTOR)),
      };
    case 'keep':
      return next;
  }
}

export function calculateWorkoutAdjustment(input: AdjustmentInput): AdjustmentResult {
  const completion = completionRate(input.planned, input.actualReps);
  const { direction, reason } = adjustmentDirection(completion, input.difficulty);
  const target = applyDirection(direction, input.next, input.planned);
  const changed = target.sets !== input.next.sets || target.reps !== input.next.reps;
  return { direction, reason: changed ? reason : null, completion, recommended: changed ? target : null };
}

// ---------- Plan integration ----------

type AdjustData = Pick<AppData, 'plan' | 'adjustments'>;

/** The latest applied adjustment for `day`, if any. */
export function appliedAdjustment(data: AdjustData, day: number): WorkoutAdjustment | undefined {
  return lastWhere(data.adjustments, (a) => a.day === day && a.applied);
}

/** What the user will actually do on `day`: the applied adjustment, else the base plan. */
export function effectivePlanDay(data: AdjustData, day: number): PlanDay | undefined {
  const base = getPlanDay(data.plan, day);
  if (base?.type !== 'workout') return base;
  const a = appliedAdjustment(data, day);
  return a ? { ...base, ...a.adjustedPlan } : base;
}

export function isAdjusted(data: AdjustData, day: number): boolean {
  return getPlanDay(data.plan, day)?.type === 'workout' && !!appliedAdjustment(data, day);
}

/** The most recent log of a day — the day's record when it was trained more than once. */
export function latestLog(data: Pick<AppData, 'workoutLogs'>, day: number): WorkoutLog | undefined {
  return lastWhere(data.workoutLogs, (l) => l.day === day);
}

/** What a log targeted. Older logs did not store it; their day had no adjustments, so the base plan applies. */
export function plannedFor(data: Pick<AppData, 'plan'>, log: WorkoutLog): SetsReps | undefined {
  if (log.planned) return log.planned;
  const base = getPlanDay(data.plan, log.day);
  return base?.type === 'workout' ? { sets: base.sets, reps: base.reps } : undefined;
}

/**
 * The workout a result on `sourceDay` may adjust: the next training day, but
 * never a Max Test, a day already done, or a session in progress.
 */
export function adjustmentTarget(data: AppData, sourceDay: number): WorkoutPlanDay | undefined {
  const next = nextTrainingDay(data.plan, sourceDay);
  if (!next || next.type !== 'workout') return undefined;
  if (isDayCompleted(data, next) || data.activeWorkout?.day === next.day) return undefined;
  return effectivePlanDay(data, next.day) as WorkoutPlanDay;
}

export interface Recommendation {
  sourceLogId: string;
  sourceDay: number;
  targetDay: number;
  direction: AdjustmentDirection;
  reason: AdjustmentReason;
  completion: number;
  original: SetsReps;
  recommended: SetsReps;
}

/** The decision already taken for a workout's recommendation, if any. */
export function adjustmentDecision(data: Pick<AppData, 'adjustments'>, logId: string): WorkoutAdjustment | undefined {
  return lastWhere(data.adjustments, (a) => a.sourceLogId === logId);
}

/**
 * The open recommendation for a finished workout, or null when there is
 * nothing to change, it was already decided, or the log is not the day's latest.
 */
export function recommendAdjustment(data: AppData, logId: string): Recommendation | null {
  const log = data.workoutLogs.find((l) => l.id === logId);
  if (!log || latestLog(data, log.day)?.id !== log.id || adjustmentDecision(data, logId)) return null;
  const target = adjustmentTarget(data, log.day);
  const planned = plannedFor(data, log);
  if (!target || !planned) return null;
  const original = { sets: target.sets, reps: target.reps };
  const result = calculateWorkoutAdjustment({
    planned,
    actualReps: log.totalReps,
    difficulty: log.difficulty,
    next: original,
  });
  if (!result.recommended || !result.reason) return null;
  return {
    sourceLogId: log.id,
    sourceDay: log.day,
    targetDay: target.day,
    direction: result.direction,
    reason: result.reason,
    completion: result.completion,
    original,
    recommended: result.recommended,
  };
}

export function toAdjustment(r: Recommendation, applied: boolean, id: string, now: number): WorkoutAdjustment {
  return {
    id,
    day: r.targetDay,
    sourceDay: r.sourceDay,
    sourceLogId: r.sourceLogId,
    originalPlan: r.original,
    adjustedPlan: r.recommended,
    reason: r.reason,
    applied,
    decidedAt: now,
  };
}

function lastWhere<T>(items: readonly T[], fn: (item: T) => boolean): T | undefined {
  for (let i = items.length - 1; i >= 0; i--) if (fn(items[i])) return items[i];
  return undefined;
}
