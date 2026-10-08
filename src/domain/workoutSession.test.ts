import { describe, expect, it } from 'vitest';
import { INACTIVITY_GAP_MS } from './activity';
import { remainingMs } from './timer';
import type { WorkoutPlanDay } from './types';
import {
  adjustRest,
  advanceIfRestOver,
  completeSet,
  finishWorkout,
  isWorkoutDone,
  pauseRest,
  skipRest,
  startWorkout,
  workoutElapsedMs,
} from './workoutSession';

const day12: WorkoutPlanDay = { day: 12, type: 'workout', sets: 4, reps: 10, restSeconds: 90 };
const REST = 90_000;
const t0 = Date.UTC(2026, 9, 8, 10);

describe('workout session', () => {
  it('goes set → rest → set and has no rest after the last set', () => {
    let s = startWorkout(day12, t0);
    expect(s.phase).toBe('set');

    s = completeSet(s, 10, REST, t0 + 30_000);
    expect(s.phase).toBe('rest');
    expect(remainingMs(s.rest!, t0 + 30_000)).toBe(REST);

    s = advanceIfRestOver(s, t0 + 30_000 + REST);
    expect(s.phase).toBe('set');
    expect(s.completedSets).toEqual([10]);

    s = completeSet(s, 10, REST, t0 + 200_000);
    s = skipRest(s, t0 + 201_000);
    s = completeSet(s, 10, REST, t0 + 230_000);
    s = skipRest(s, t0 + 231_000);
    s = completeSet(s, 10, REST, t0 + 260_000);
    expect(isWorkoutDone(s)).toBe(true);
    expect(s.phase).toBe('set');
    expect(s.rest).toBeNull();

    const log = finishWorkout(s, t0 + 260_000, 'x');
    expect(log.totalReps).toBe(40);
    expect(log.sets).toEqual([10, 10, 10, 10]);
    expect(log.durationSec).toBe(260);
  });

  it('ignores extra completes once done (double tap)', () => {
    let s = startWorkout({ ...day12, sets: 1 }, t0);
    s = completeSet(s, 10, REST, t0 + 1000);
    expect(completeSet(s, 10, REST, t0 + 1100)).toBe(s);
  });

  it('rest that ended while the app was closed advances on load', () => {
    let s = completeSet(startWorkout(day12, t0), 10, REST, t0);
    s = JSON.parse(JSON.stringify(s));
    expect(advanceIfRestOver(s, t0 + 60_000).phase).toBe('rest');
    expect(advanceIfRestOver(s, t0 + 10 * 60_000).phase).toBe('set');
  });

  it('paused rest does not advance', () => {
    let s = completeSet(startWorkout(day12, t0), 10, REST, t0);
    s = pauseRest(s, t0 + 5000);
    expect(advanceIfRestOver(s, t0 + 3_600_000).phase).toBe('rest');
  });

  it('-15s on an almost finished rest ends it on the next tick', () => {
    let s = completeSet(startWorkout(day12, t0), 10, REST, t0);
    s = adjustRest(s, -15_000, t0 + 80_000);
    expect(advanceIfRestOver(s, t0 + 80_000).phase).toBe('set');
  });

  it('does not count a long absence as workout time', () => {
    let s = startWorkout(day12, t0);
    s = completeSet(s, 10, REST, t0 + 60_000);
    const back = t0 + 60_000 + INACTIVITY_GAP_MS + 3_600_000;
    expect(workoutElapsedMs(s, back)).toBe(60_000);
    s = skipRest(s, back);
    s = completeSet(s, 10, REST, back + 30_000);
    expect(workoutElapsedMs(s, back + 30_000)).toBe(90_000);
  });
});
