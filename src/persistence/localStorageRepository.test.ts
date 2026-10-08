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

  it('returns null for corrupt data instead of crashing', () => {
    const storage = new MemoryStorage();
    storage.setItem('pushup30:data', '{not json');
    expect(new LocalStorageRepository(storage).load()).toBeNull();
  });
});
