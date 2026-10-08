import type { AppData, Settings } from '../domain/types';
import { DEFAULT_WORKOUT_TIME } from '../domain/workoutTime';

/**
 * Persistence boundary. The store only talks to this interface, so the
 * localStorage implementation can later be swapped for an API-backed one.
 */
export interface Repository {
  load(): AppData | null;
  save(data: AppData): void;
  clear(): void;
}

export const DEFAULT_SETTINGS: Settings = {
  restSeconds: null,
  sound: true,
  vibration: true,
  reminder: { enabled: false, ...DEFAULT_WORKOUT_TIME, lastFiredDate: null, promptAnswered: false },
  language: null,
};

export function emptyData(): AppData {
  return {
    profile: null,
    plan: [],
    workoutLogs: [],
    testResults: [],
    adjustments: [],
    activeWorkout: null,
    activeTest: null,
    settings: structuredClone(DEFAULT_SETTINGS),
  };
}
