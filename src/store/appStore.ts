import { create } from 'zustand';
import { isRecentlyActive } from '../domain/activity';
import { effectivePlanDay, isAdjusted, recommendAdjustment, toAdjustment } from '../domain/adjustment';
import { generatePlan, getPlanDay, restSecondsFor } from '../domain/plan';
import { catchUpStartDate, currentDayNumber, isDayUnlocked, missedDays } from '../domain/schedule';
import { bestMax } from '../domain/stats';
import * as test from '../domain/testSession';
import type { AppData, Difficulty, Language, Settings, TimeOfDay } from '../domain/types';
import * as workout from '../domain/workoutSession';
import { isPastWorkoutTime } from '../domain/workoutTime';
import { LocalStorageRepository } from '../persistence/localStorageRepository';
import { emptyData, type Repository } from '../persistence/repository';
import { now, todayKey } from '../services/clock';
import { newId } from '../services/ids';

export type Tab = 'today' | 'progress' | 'plan' | 'settings';

export type Overlay =
  | { kind: 'workout' }
  | { kind: 'workout-complete'; logId: string }
  | { kind: 'test' }
  | { kind: 'test-result'; resultId: string }
  | { kind: 'day'; day: number };

interface Actions {
  completeOnboarding(initialMax: number, goal: number): void;

  startWorkout(day: number): void;
  /** Completes the current set with the reps actually done (default: the target). */
  completeSet(repsDone?: number): void;
  skipRest(): void;
  pauseRest(): void;
  resumeRest(): void;
  adjustRest(deltaSeconds: number): void;
  /** Advances to the next set when rest runs out. Returns true when it did. */
  tick(): boolean;
  heartbeat(): void;
  abandonWorkout(): void;
  /** "How was today's workout?" — null clears it (skip). */
  rateWorkout(logId: string, difficulty: Difficulty | null): void;
  /** Apply or keep the plan for a finished workout's recommendation. Records it in the history either way. */
  decideAdjustment(logId: string, apply: boolean): void;

  startTest(day: number): void;
  addTestReps(delta: number): void;
  finishTest(): void;
  abandonTest(): void;

  catchUp(): void;
  updateSettings(patch: Partial<Settings>): void;
  setWorkoutTime(time: TimeOfDay): void;
  /** Call after notification permission was checked/granted. Also answers the reminder prompt. */
  setReminderEnabled(enabled: boolean): void;
  dismissReminderPrompt(): void;
  markReminderShown(): void;
  setLanguage(language: Language): void;
  setGoal(goal: number): void;
  resetChallenge(): void;

  setTab(tab: Tab): void;
  openOverlay(o: Overlay): void;
  closeOverlay(): void;
}

export interface AppState extends Actions {
  data: AppData;
  tab: Tab;
  overlay: Overlay | null;
}

const repository: Repository = new LocalStorageRepository();

function initialOverlay(data: AppData): Overlay | null {
  const t = now();
  if (data.activeWorkout && isRecentlyActive(data.activeWorkout, t)) return { kind: 'workout' };
  if (data.activeTest && isRecentlyActive(data.activeTest, t)) return { kind: 'test' };
  return null;
}

function loadData(): AppData {
  const data = repository.load() ?? emptyData();
  // Rest may have ended while the app was closed.
  if (data.activeWorkout) data.activeWorkout = workout.advanceIfRestOver(data.activeWorkout, now());
  return data;
}

const loaded = loadData();

export const useApp = create<AppState>()((set, get) => {
  const update = (fn: (d: AppData) => AppData) => set((s) => ({ data: fn(s.data) }));

  return {
    data: loaded,
    tab: 'today',
    overlay: initialOverlay(loaded),

    completeOnboarding(initialMax, goal) {
      update((d) => ({
        ...d,
        profile: { initialMax, goal, startDate: todayKey() },
        plan: generatePlan(initialMax),
      }));
      set({ tab: 'today', overlay: null });
    },

    startWorkout(day) {
      const { data } = get();
      const plan = effectivePlanDay(data, day);
      if (!plan || plan.type !== 'workout' || !data.profile) return;
      if (!isDayUnlocked(day, currentDayNumber(data.profile, todayKey()))) return;
      // Resume the same day's session; any other unfinished session is replaced.
      if (data.activeWorkout?.day !== day) {
        update((d) => ({ ...d, activeWorkout: workout.startWorkout(plan, now(), isAdjusted(data, day)) }));
      } else {
        update((d) => ({ ...d, activeWorkout: workout.heartbeat(d.activeWorkout!, now()) }));
      }
      set({ overlay: { kind: 'workout' } });
    },

    completeSet(repsDone) {
      const { data } = get();
      const s = data.activeWorkout;
      if (!s) return;
      const plan = getPlanDay(data.plan, s.day);
      const restMs = plan?.type === 'workout' ? restSecondsFor(plan, data.settings) * 1000 : 0;
      const t = now();
      const reps = repsDone === undefined ? s.reps : Math.max(0, Math.round(repsDone));
      const next = workout.completeSet(s, reps, restMs, t);
      if (!workout.isWorkoutDone(next)) {
        update((d) => ({ ...d, activeWorkout: next }));
        return;
      }
      const log = workout.finishWorkout(next, t, newId());
      // Single update so no render sees "no session" while the overlay still says workout.
      set((st) => ({
        data: { ...st.data, activeWorkout: null, workoutLogs: [...st.data.workoutLogs, log] },
        overlay: { kind: 'workout-complete', logId: log.id },
      }));
    },

    skipRest: () => withWorkout(update, (s) => workout.skipRest(s, now())),
    pauseRest: () => withWorkout(update, (s) => workout.pauseRest(s, now())),
    resumeRest: () => withWorkout(update, (s) => workout.resumeRest(s, now())),
    adjustRest: (deltaSeconds) => withWorkout(update, (s) => workout.adjustRest(s, deltaSeconds * 1000, now())),
    heartbeat: () => {
      withWorkout(update, (s) => workout.heartbeat(s, now()));
      const t = get().data.activeTest;
      if (t) update((d) => ({ ...d, activeTest: test.addReps(t, 0, now()) }));
    },

    tick() {
      const s = get().data.activeWorkout;
      if (!s) return false;
      const next = workout.advanceIfRestOver(s, now());
      if (next === s) return false;
      update((d) => ({ ...d, activeWorkout: next }));
      return true;
    },

    abandonWorkout() {
      set((st) => ({ data: { ...st.data, activeWorkout: null }, overlay: null }));
    },

    rateWorkout(logId, difficulty) {
      update((d) => ({
        ...d,
        workoutLogs: d.workoutLogs.map((l) => {
          if (l.id !== logId) return l;
          const { difficulty: _, ...rest } = l;
          return difficulty ? { ...rest, difficulty } : rest;
        }),
      }));
    },

    decideAdjustment(logId, apply) {
      // Recomputed from saved data, so a stale or repeated tap cannot record twice.
      const rec = recommendAdjustment(get().data, logId);
      if (!rec) return;
      const entry = toAdjustment(rec, apply, newId(), now());
      update((d) => ({ ...d, adjustments: [...d.adjustments, entry] }));
    },

    startTest(day) {
      const { data } = get();
      const plan = getPlanDay(data.plan, day);
      if (!plan || plan.type !== 'test' || !data.profile) return;
      if (!isDayUnlocked(day, currentDayNumber(data.profile, todayKey()))) return;
      if (data.activeTest?.day !== day) {
        update((d) => ({ ...d, activeTest: test.startTest(day, now()) }));
      }
      set({ overlay: { kind: 'test' } });
    },

    addTestReps(delta) {
      const t = get().data.activeTest;
      if (t) update((d) => ({ ...d, activeTest: test.addReps(t, delta, now()) }));
    },

    finishTest() {
      const { data } = get();
      const t = data.activeTest;
      if (!t) return;
      const result = test.finishTest(t, bestMax(data), now(), newId());
      set((st) => ({
        data: { ...st.data, activeTest: null, testResults: [...st.data.testResults, result] },
        overlay: { kind: 'test-result', resultId: result.id },
      }));
    },

    abandonTest() {
      set((st) => ({ data: { ...st.data, activeTest: null }, overlay: null }));
    },

    catchUp() {
      const { data } = get();
      if (!data.profile) return;
      const today = todayKey();
      const first = missedDays(data, currentDayNumber(data.profile, today))[0];
      if (!first) return;
      update((d) => ({ ...d, profile: { ...d.profile!, startDate: catchUpStartDate(today, first.day) } }));
    },

    updateSettings(patch) {
      update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
    },

    setWorkoutTime(time) {
      // A time still ahead today may remind again today; one already passed waits for tomorrow.
      const rearm = !isPastWorkoutTime(time, now());
      updateReminder(update, (r) => ({ ...r, ...time, lastFiredDate: rearm ? null : r.lastFiredDate }));
    },

    setReminderEnabled(enabled) {
      updateReminder(update, (r) => ({ ...r, enabled, promptAnswered: true }));
    },

    dismissReminderPrompt() {
      updateReminder(update, (r) => ({ ...r, promptAnswered: true }));
    },

    markReminderShown() {
      updateReminder(update, (r) => ({ ...r, lastFiredDate: todayKey() }));
    },

    setLanguage(language) {
      update((d) => ({ ...d, settings: { ...d.settings, language } }));
    },

    setGoal(goal) {
      update((d) => (d.profile ? { ...d, profile: { ...d.profile, goal } } : d));
    },

    resetChallenge() {
      // Keep preferences; wipe the challenge (logs, tests, adjustments → back to a fresh base plan).
      const settings = get().data.settings;
      update(() => ({ ...emptyData(), settings }));
      set({ tab: 'today', overlay: null });
    },

    setTab: (tab) => set({ tab, overlay: null }),
    openOverlay: (overlay) => set({ overlay }),
    closeOverlay: () => set({ overlay: null }),
  };
});

function updateReminder(
  update: (fn: (d: AppData) => AppData) => void,
  fn: (r: Settings['reminder']) => Settings['reminder'],
) {
  update((d) => ({ ...d, settings: { ...d.settings, reminder: fn(d.settings.reminder) } }));
}

function withWorkout(
  update: (fn: (d: AppData) => AppData) => void,
  fn: (s: NonNullable<AppData['activeWorkout']>) => NonNullable<AppData['activeWorkout']>,
) {
  update((d) => (d.activeWorkout ? { ...d, activeWorkout: fn(d.activeWorkout) } : d));
}

// Persist every data change. UI state (tab/overlay) is not persisted.
let applyingRemote = false;
useApp.subscribe((state, prev) => {
  if (state.data !== prev.data && !applyingRemote) repository.save(state.data);
});

/** Another tab saved newer data (e.g. app open twice) → adopt it instead of overwriting it. */
export function syncFromOtherTabs(): void {
  window.addEventListener('storage', () => {
    const data = repository.load();
    if (!data) return;
    applyingRemote = true;
    useApp.setState({ data });
    applyingRemote = false;
  });
}
