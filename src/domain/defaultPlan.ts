import type { PlanDay } from './types';

export const DEFAULT_REST_SECONDS = 90;
export const DEFAULT_GOAL = 50;
/** The max the default plan is designed for. */
export const DEFAULT_PLAN_BASE_MAX = 10;

const w = (day: number, sets: number, reps: number): PlanDay => ({
  day,
  type: 'workout',
  sets,
  reps,
  restSeconds: DEFAULT_REST_SECONDS,
});
const rest = (day: number): PlanDay => ({ day, type: 'rest' });
const test = (day: number): PlanDay => ({ day, type: 'test' });

/** 30-day plan for someone starting at ~10 push-ups. */
export const DEFAULT_PLAN: readonly PlanDay[] = [
  w(1, 5, 5),
  w(2, 4, 5),
  rest(3),
  w(4, 5, 6),
  w(5, 4, 6),
  w(6, 3, 8),
  rest(7),
  w(8, 5, 7),
  w(9, 4, 8),
  rest(10),
  w(11, 5, 8),
  w(12, 4, 10),
  w(13, 3, 10),
  rest(14),
  test(15),
  rest(16),
  w(17, 5, 9),
  w(18, 4, 10),
  w(19, 5, 10),
  rest(20),
  w(21, 4, 12),
  w(22, 3, 15),
  rest(23),
  w(24, 5, 12),
  w(25, 4, 15),
  rest(26),
  w(27, 3, 15),
  w(28, 2, 20),
  rest(29),
  test(30),
];
