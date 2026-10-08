/** Local calendar date, formatted YYYY-MM-DD. */
export type DateKey = string;

export interface WorkoutPlanDay {
  day: number;
  type: 'workout';
  sets: number;
  reps: number;
  restSeconds?: number;
}

export interface RestPlanDay {
  day: number;
  type: 'rest';
}

export interface TestPlanDay {
  day: number;
  type: 'test';
}

export type PlanDay = WorkoutPlanDay | RestPlanDay | TestPlanDay;
export type TrainingPlanDay = WorkoutPlanDay | TestPlanDay;

export interface Profile {
  initialMax: number;
  goal: number;
  /** Calendar date of Day 1. Moving it shifts the whole schedule (catch-up). */
  startDate: DateKey;
}

export interface WorkoutLog {
  id: string;
  day: number;
  date: DateKey;
  startedAt: number;
  finishedAt: number;
  durationSec: number;
  /** Reps done per set. */
  sets: number[];
  totalReps: number;
}

export interface TestResult {
  id: string;
  day: number;
  date: DateKey;
  reps: number;
  durationSec: number;
  /** Best max known before this test (initial max or earlier test). */
  previousBest: number;
}

export interface RestTimer {
  durationMs: number;
  /** Set while running. */
  endsAt: number | null;
  /** Set while paused. */
  remainingMs: number | null;
}

export interface ActiveWorkout {
  day: number;
  sets: number;
  reps: number;
  startedAt: number;
  /** Time excluded from duration (app closed for a long time). */
  pausedMs: number;
  lastActiveAt: number;
  completedSets: number[];
  phase: 'set' | 'rest';
  rest: RestTimer | null;
}

export interface ActiveTest {
  day: number;
  startedAt: number;
  pausedMs: number;
  lastActiveAt: number;
  reps: number;
}

export interface TimeOfDay {
  hour: number;
  minute: number;
}

/** Supported UI languages. */
export type Language = 'vi' | 'en';

export interface ReminderSettings {
  enabled: boolean;
  /** Daily workout time (local). The reminder fires at this time. */
  hour: number;
  minute: number;
  lastFiredDate: DateKey | null;
  /** The "Stay on track" prompt was answered (enabled or "Not now"); don't show it again. */
  promptAnswered: boolean;
}

export interface Settings {
  /** null = use the plan's rest time. */
  restSeconds: number | null;
  sound: boolean;
  vibration: boolean;
  reminder: ReminderSettings;
  /** null = follow the browser/device language. */
  language: Language | null;
}

export interface AppData {
  profile: Profile | null;
  plan: PlanDay[];
  workoutLogs: WorkoutLog[];
  testResults: TestResult[];
  activeWorkout: ActiveWorkout | null;
  activeTest: ActiveTest | null;
  settings: Settings;
}

export type DayStatus = 'completed' | 'missed' | 'rest' | 'today' | 'upcoming';
