import { describe, expect, it } from 'vitest';
import { generatePlan } from '../domain/plan';
import { LocalStorageRepository } from './localStorageRepository';
import { emptyData } from './repository';

class MemoryStorage implements Storage {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  clear() {
    this.m.clear();
  }
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
}

describe('LocalStorageRepository', () => {
  it('round-trips data including an active session', () => {
    const storage = new MemoryStorage();
    const repo = new LocalStorageRepository(storage);
    const data = {
      ...emptyData(),
      profile: { initialMax: 10, goal: 50, startDate: '2026-10-08' },
      plan: generatePlan(10),
      activeWorkout: {
        day: 1, sets: 5, reps: 5, startedAt: 1, pausedMs: 0, lastActiveAt: 2,
        completedSets: [5, 5], phase: 'rest' as const,
        rest: { durationMs: 90_000, endsAt: 92_000, remainingMs: null },
      },
    };
    repo.save(data);
    expect(new LocalStorageRepository(storage).load()).toEqual(data);
  });

  it('fills in settings added after the data was saved', () => {
    const storage = new MemoryStorage();
    storage.setItem('pushup30:data', JSON.stringify({ version: 1, data: { ...emptyData(), settings: { restSeconds: 60 } } }));
    const loaded = new LocalStorageRepository(storage).load()!;
    expect(loaded.settings.restSeconds).toBe(60);
    expect(loaded.settings.reminder).toMatchObject({ enabled: false, hour: 6, minute: 30 });
    expect(loaded.settings.language).toBeNull();
    expect(loaded.settings.sound).toBe(true);
  });

  it('migrates the v1 "HH:MM" reminder time', () => {
    const v1 = (reminder: object) => {
      const storage = new MemoryStorage();
      const settings = { restSeconds: null, sound: true, vibration: true, reminder };
      storage.setItem('pushup30:data', JSON.stringify({ version: 1, data: { ...emptyData(), settings } }));
      return new LocalStorageRepository(storage).load()!.settings.reminder;
    };
    // The old default (18:00) was never a choice → new 06:30 default.
    expect(v1({ enabled: true, time: '18:00', lastFiredDate: null })).toEqual({
      enabled: true, hour: 6, minute: 30, lastFiredDate: null, promptAnswered: false,
    });
    // A time the user picked is kept.
    expect(v1({ enabled: false, time: '05:45', lastFiredDate: '2026-10-07' })).toMatchObject({
      hour: 5, minute: 45, lastFiredDate: '2026-10-07',
    });
    expect(v1({ enabled: false, time: '05:45', lastFiredDate: null })).not.toHaveProperty('time');
  });

  it('keeps V1 workout history and adds an empty adjustment history (V1.1)', () => {
    const storage = new MemoryStorage();
    const { adjustments: _, ...v1 } = {
      ...emptyData(),
      profile: { initialMax: 10, goal: 50, startDate: '2026-10-01' },
      plan: generatePlan(10),
      workoutLogs: [{ id: 'a', day: 1, date: '2026-10-01', startedAt: 0, finishedAt: 1, durationSec: 1, sets: [5, 5, 5, 5, 5], totalReps: 25 }],
    };
    storage.setItem('pushup30:data', JSON.stringify({ version: 2, data: v1 }));
    const loaded = new LocalStorageRepository(storage).load()!;
    expect(loaded.adjustments).toEqual([]);
    expect(loaded.workoutLogs).toEqual(v1.workoutLogs);
    expect(loaded.plan).toEqual(v1.plan);
  });

  it('round-trips difficulty, planned target and applied adjustments', () => {
    const storage = new MemoryStorage();
    const data = {
      ...emptyData(),
      profile: { initialMax: 10, goal: 50, startDate: '2026-10-01' },
      plan: generatePlan(10),
      workoutLogs: [
        { id: 'a', day: 11, date: '2026-10-11', startedAt: 0, finishedAt: 1, durationSec: 1, sets: [8, 8, 5, 4, 3], totalReps: 28,
          planned: { sets: 5, reps: 8 }, adjusted: false, difficulty: 'very_hard' as const },
      ],
      adjustments: [
        { id: 'x', day: 12, sourceDay: 11, sourceLogId: 'a', originalPlan: { sets: 4, reps: 10 }, adjustedPlan: { sets: 3, reps: 8 },
          reason: 'very_hard' as const, applied: true, decidedAt: 5 },
      ],
    };
    new LocalStorageRepository(storage).save(data);
    expect(new LocalStorageRepository(storage).load()).toEqual(data);
  });

  it('returns null for corrupt data instead of crashing', () => {
    const storage = new MemoryStorage();
    storage.setItem('pushup30:data', '{not json');
    expect(new LocalStorageRepository(storage).load()).toBeNull();
  });
});
