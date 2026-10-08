import { completionRate, latestLog, plannedFor } from './adjustment';
import { getPlanDay } from './plan';
import { isDayCompleted } from './schedule';
import { bestMax } from './stats';
import { improvement, type Improvement } from './testSession';
import type { AppData, DateKey, SetsReps, TestResult, WorkoutLog } from './types';

/**
 * Progress view model. Only real, recorded results are used — no planned
 * numbers, no interpolation for days that have not happened.
 */

export interface MaxPoint {
  day: number;
  date: DateKey;
  reps: number;
  kind: 'initial' | 'test';
}

/** Starting max (Day 1) + the best result of each Max Test day, in day order. */
export function maxProgressPoints(data: AppData): MaxPoint[] {
  if (!data.profile) return [];
  const best = new Map<number, TestResult>();
  for (const r of data.testResults) {
    const prev = best.get(r.day);
    if (!prev || r.reps > prev.reps) best.set(r.day, r);
  }
  const tests = [...best.values()]
    .sort((a, b) => a.day - b.day)
    .map((r): MaxPoint => ({ day: r.day, date: r.date, reps: r.reps, kind: 'test' }));
  return [{ day: 1, date: data.profile.startDate, reps: data.profile.initialMax, kind: 'initial' }, ...tests];
}

export interface ProgressSummary {
  startingMax: number;
  currentBest: number;
  goal: number;
  improvement: Improvement;
  toGoal: number;
  hasTests: boolean;
  /** The next Max Test not done yet, from today on. */
  nextTestDay: number | null;
}

export function progressSummary(data: AppData, todayDay: number): ProgressSummary {
  const startingMax = data.profile?.initialMax ?? 0;
  const currentBest = bestMax(data);
  const goal = data.profile?.goal ?? 0;
  const nextTest = data.plan.find((d) => d.type === 'test' && d.day >= todayDay && !isDayCompleted(data, d));
  return {
    startingMax,
    currentBest,
    goal,
    improvement: improvement(startingMax, currentBest),
    toGoal: Math.max(0, goal - currentBest),
    hasTests: data.testResults.length > 0,
    nextTestDay: nextTest?.day ?? null,
  };
}

// ---------- Milestones ----------

export interface Milestone {
  kind: 'started' | 'reps' | 'goal';
  reps: number;
  achieved: boolean;
  /** Where it was first reached (Day 1 for the starting max). */
  day: number | null;
  date: DateKey | null;
}

const MILESTONE_STEP = 10;
const MAX_STEP_MILESTONES = 4;

/**
 * Started → every 10 reps between start and goal (thinned to at most 4) → Goal.
 * Reached only by a real result (starting max or a Max Test).
 */
export function milestones(data: AppData): Milestone[] {
  if (!data.profile) return [];
  const { initialMax, goal } = data.profile;
  const points = maxProgressPoints(data);
  const reached = (reps: number) => points.find((p) => p.reps >= reps);
  const make = (kind: Milestone['kind'], reps: number): Milestone => {
    const p = reached(reps);
    return { kind, reps, achieved: !!p, day: p?.day ?? null, date: p?.date ?? null };
  };

  const thresholds: number[] = [];
  for (let r = (Math.floor(initialMax / MILESTONE_STEP) + 1) * MILESTONE_STEP; r < goal; r += MILESTONE_STEP) {
    thresholds.push(r);
  }
  const stride = Math.ceil(thresholds.length / MAX_STEP_MILESTONES);
  const steps = thresholds.filter((_, i) => (thresholds.length - 1 - i) % stride === 0);

  return [make('started', initialMax), ...steps.map((r) => make('reps', r)), make('goal', goal)];
}

// ---------- Workout history ----------

export interface WorkoutRecord {
  day: number;
  /** The day's latest attempt; earlier attempts stay in `attempts`. */
  log: WorkoutLog;
  attempts: number;
  /** The base plan for the day. */
  base: SetsReps | null;
  /** What the session targeted (adjusted or base). */
  planned: SetsReps | null;
  adjusted: boolean;
  completion: number | null;
}

export function workoutRecord(data: AppData, log: WorkoutLog): WorkoutRecord {
  const base = getPlanDay(data.plan, log.day);
  const planned = plannedFor(data, log) ?? null;
  return {
    day: log.day,
    log,
    attempts: data.workoutLogs.filter((l) => l.day === log.day).length,
    base: base?.type === 'workout' ? { sets: base.sets, reps: base.reps } : null,
    planned,
    adjusted: log.adjusted ?? false,
    completion: planned ? completionRate(planned, log.totalReps) : null,
  };
}

/** One record per trained day (its latest attempt), in day order. */
export function workoutRecords(data: AppData): WorkoutRecord[] {
  const days = [...new Set(data.workoutLogs.map((l) => l.day))].sort((a, b) => a - b);
  return days.map((day) => workoutRecord(data, latestLog(data, day)!));
}

export type HistoryEntry =
  | { kind: 'workout'; day: number; record: WorkoutRecord }
  | { kind: 'test'; day: number; reps: number }
  | { kind: 'rest'; day: number };

/** Newest first: trained days, Max Tests and past rest days. Missed days are left to the calendar. */
export function historyEntries(data: AppData, todayDay: number): HistoryEntry[] {
  const records = new Map(workoutRecords(data).map((r) => [r.day, r]));
  const tests = maxProgressPoints(data).filter((p) => p.kind === 'test');
  const entries: HistoryEntry[] = [];
  for (const d of [...data.plan].reverse()) {
    const record = records.get(d.day);
    const test = tests.find((p) => p.day === d.day);
    if (d.type === 'workout' && record) entries.push({ kind: 'workout', day: d.day, record });
    else if (d.type === 'test' && test) entries.push({ kind: 'test', day: d.day, reps: test.reps });
    else if (d.type === 'rest' && d.day < todayDay) entries.push({ kind: 'rest', day: d.day });
  }
  // Rest days only between real entries, not a run of them before anything was trained.
  while (entries.length && entries[entries.length - 1].kind === 'rest') entries.pop();
  return entries;
}
