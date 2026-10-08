import { describe, expect, it } from 'vitest';
import { DEFAULT_PLAN } from '../domain/defaultPlan';
import type { AppData } from '../domain/types';
import { translator } from '../i18n/i18n';
import { emptyData } from '../persistence/repository';
import { dueReminder, reminderNotification, todaysReminder } from './reminders';

// Day 1 = 2026-10-01 → Day 12 (4 × 10) is 2026-10-12, Day 14 rest, Day 15 max test.
const base = (): AppData => {
  const d = emptyData();
  return {
    ...d,
    profile: { initialMax: 10, goal: 50, startDate: '2026-10-01' },
    plan: [...DEFAULT_PLAN],
    settings: { ...d.settings, reminder: { ...d.settings.reminder, enabled: true } },
  };
};
const at = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00`).getTime();
const log = (day: number, date: string) => ({ id: 'a', day, date, startedAt: 0, finishedAt: 0, durationSec: 1, sets: [10], totalReps: 10 });

describe('dueReminder', () => {
  it('fires at the 06:30 default on a workout day', () => {
    expect(dueReminder(base(), '2026-10-12', at('2026-10-12', '06:29'))).toBeNull();
    expect(dueReminder(base(), '2026-10-12', at('2026-10-12', '06:30'))).toMatchObject({ kind: 'workout', day: 12 });
  });

  it('follows a changed workout time', () => {
    const d = base();
    d.settings.reminder = { ...d.settings.reminder, hour: 7, minute: 0 };
    expect(dueReminder(d, '2026-10-12', at('2026-10-12', '06:45'))).toBeNull();
    expect(dueReminder(d, '2026-10-12', at('2026-10-12', '07:00'))).not.toBeNull();
  });

  it('stays quiet long after the workout time (Today shows "waiting" instead)', () => {
    expect(dueReminder(base(), '2026-10-12', at('2026-10-12', '08:29'))).not.toBeNull();
    expect(dueReminder(base(), '2026-10-12', at('2026-10-12', '10:00'))).toBeNull();
  });

  it('stays quiet when done, already shown, or disabled', () => {
    const fired = base();
    fired.settings.reminder.lastFiredDate = '2026-10-12';
    expect(dueReminder(fired, '2026-10-12', at('2026-10-12', '06:45'))).toBeNull();
    const off = base();
    off.settings.reminder.enabled = false;
    expect(dueReminder(off, '2026-10-12', at('2026-10-12', '06:45'))).toBeNull();
    const done = { ...base(), workoutLogs: [log(12, '2026-10-12')] };
    expect(dueReminder(done, '2026-10-12', at('2026-10-12', '06:45'))).toBeNull();
  });
});

describe('todaysReminder', () => {
  it('covers rest and test days', () => {
    expect(todaysReminder(base(), '2026-10-14')).toEqual({ kind: 'rest', day: 14, nextDay: 15 });
    expect(todaysReminder(base(), '2026-10-15')).toEqual({ kind: 'test', day: 15, best: 10 });
    expect(todaysReminder(base(), '2026-11-15')).toBeNull(); // challenge over
  });
});

describe('reminderNotification', () => {
  const en = translator('en');
  const vi = translator('vi');

  it('shows the workout of the day', () => {
    const r = todaysReminder(base(), '2026-10-12')!;
    expect(reminderNotification(r, en)).toEqual({
      title: '💪 Time for your workout',
      body: 'Day 12 is ready.\n4 × 10 push-ups',
      startAction: true,
    });
    expect(reminderNotification(r, vi).body).toBe('Ngày 12 đã sẵn sàng.\n4 × 10 hít đất');
  });

  it('says "tomorrow" on a rest day before a workout day', () => {
    const n = reminderNotification({ kind: 'rest', day: 13, nextDay: 14 }, en);
    expect(n.title).toBe('🌿 Recovery Day');
    expect(n.body).toBe('Take a rest today.\nYour next workout is tomorrow.');
    expect(reminderNotification({ kind: 'rest', day: 14, nextDay: 17 }, en).body).toContain('Day 17');
  });
});
