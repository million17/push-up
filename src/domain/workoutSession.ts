import { activeElapsedMs, touch } from './activity';
import { dateKeyFromMs } from './dates';
import { adjustTimer, isFinished, pauseTimer, resumeTimer, startTimer } from './timer';
import type { ActiveWorkout, WorkoutLog, WorkoutPlanDay } from './types';

/**
 * Workout state machine: set → rest → set → … → (last set) → done.
 * All functions are pure; `now` is always passed in.
 */

export function startWorkout(plan: WorkoutPlanDay, now: number): ActiveWorkout {
  return {
    day: plan.day,
    sets: plan.sets,
    reps: plan.reps,
    startedAt: now,
    pausedMs: 0,
    lastActiveAt: now,
    completedSets: [],
    phase: 'set',
    rest: null,
  };
}

export function currentSetIndex(s: ActiveWorkout): number {
  return s.completedSets.length;
}

export function isWorkoutDone(s: ActiveWorkout): boolean {
  return s.completedSets.length >= s.sets;
}

/** Completes the current set. No rest after the last set. */
export function completeSet(s: ActiveWorkout, repsDone: number, restMs: number, now: number): ActiveWorkout {
  if (s.phase !== 'set' || isWorkoutDone(s)) return s;
  const next = touch({ ...s, completedSets: [...s.completedSets, repsDone] }, now);
  if (isWorkoutDone(next) || restMs <= 0) return { ...next, phase: 'set', rest: null };
  return { ...next, phase: 'rest', rest: startTimer(restMs, now) };
}

export function skipRest(s: ActiveWorkout, now: number): ActiveWorkout {
  if (s.phase !== 'rest') return s;
  return touch({ ...s, phase: 'set', rest: null }, now);
}

export function pauseRest(s: ActiveWorkout, now: number): ActiveWorkout {
  if (!s.rest) return s;
  return touch({ ...s, rest: pauseTimer(s.rest, now) }, now);
}

export function resumeRest(s: ActiveWorkout, now: number): ActiveWorkout {
  if (!s.rest) return s;
  return touch({ ...s, rest: resumeTimer(s.rest, now) }, now);
}

export function adjustRest(s: ActiveWorkout, deltaMs: number, now: number): ActiveWorkout {
  if (!s.rest) return s;
  return touch({ ...s, rest: adjustTimer(s.rest, deltaMs, now) }, now);
}

/** Moves to the next set when the rest timer has run out (also after a reload). */
export function advanceIfRestOver(s: ActiveWorkout, now: number): ActiveWorkout {
  if (s.phase === 'rest' && s.rest && isFinished(s.rest, now)) {
    return { ...s, phase: 'set', rest: null };
  }
  return s;
}

export function heartbeat(s: ActiveWorkout, now: number): ActiveWorkout {
  return touch(s, now);
}

export function workoutElapsedMs(s: ActiveWorkout, now: number): number {
  return activeElapsedMs(s, now);
}

export function finishWorkout(s: ActiveWorkout, now: number, id: string): WorkoutLog {
  const totalReps = s.completedSets.reduce((a, b) => a + b, 0);
  return {
    id,
    day: s.day,
    date: dateKeyFromMs(now),
    startedAt: s.startedAt,
    finishedAt: now,
    durationSec: Math.round(workoutElapsedMs(s, now) / 1000),
    sets: [...s.completedSets],
    totalReps,
  };
}
