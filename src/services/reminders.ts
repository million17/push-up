import { effectivePlanDay } from '../domain/adjustment';
import { formatWorkout } from '../domain/plan';
import { currentDayNumber, isDayCompleted, nextTrainingDay } from '../domain/schedule';
import { bestMax } from '../domain/stats';
import type { AppData, DateKey, WorkoutPlanDay } from '../domain/types';
import { isPastWorkoutTime, minutesOfDay, workoutTime } from '../domain/workoutTime';
import type { TFunction } from '../i18n/i18n';
import { now, todayKey } from './clock';

/**
 * Web reminders without a backend. A web page cannot wake itself up at a set
 * time, so the reminder is checked while the app is open (tab or installed
 * PWA, also in the background). For a reminder that always rings, Settings
 * offers a calendar event with an alarm (see calendarExport.ts).
 */

/** After this long past the workout time, no notification (Today shows "workout is waiting" instead). */
export const REMINDER_WINDOW_MS = 2 * 60 * 60_000;

export type Reminder =
  | { kind: 'workout'; day: number; plan: WorkoutPlanDay }
  | { kind: 'test'; day: number; best: number }
  | { kind: 'rest'; day: number; nextDay: number | null };

export interface NotificationContent {
  title: string;
  body: string;
  /** Show a "Start Workout" button (where the platform supports actions). */
  startAction: boolean;
}

export type PermissionState = NotificationPermission | 'unsupported';

/** What today's reminder is about. Null once today's training is done or the challenge is over. */
export function todaysReminder(data: AppData, today: DateKey = todayKey()): Reminder | null {
  if (!data.profile) return null;
  const day = currentDayNumber(data.profile, today);
  const plan = effectivePlanDay(data, day);
  if (!plan || isDayCompleted(data, plan)) return null;
  if (plan.type === 'workout') return { kind: 'workout', day, plan };
  if (plan.type === 'test') return { kind: 'test', day, best: bestMax(data) };
  return { kind: 'rest', day, nextDay: nextTrainingDay(data.plan, day)?.day ?? null };
}

/** The reminder to show now, if any: enabled, not shown yet today, and within the window after the workout time. */
export function dueReminder(data: AppData, today: DateKey = todayKey(), nowMs = now()): Reminder | null {
  const { reminder } = data.settings;
  if (!reminder.enabled || reminder.lastFiredDate === today) return null;
  const time = workoutTime(data.settings);
  if (!isPastWorkoutTime(time, nowMs)) return null;
  const at = new Date(nowMs);
  const sinceMs = (at.getHours() * 60 + at.getMinutes() - minutesOfDay(time)) * 60_000;
  if (sinceMs >= REMINDER_WINDOW_MS) return null;
  return todaysReminder(data, today);
}

export function reminderNotification(r: Reminder, t: TFunction): NotificationContent {
  switch (r.kind) {
    case 'workout':
      return {
        title: t('notification.workoutTitle'),
        body: t('notification.workoutBody', { day: r.day, scheme: formatWorkout(r.plan) }),
        startAction: true,
      };
    case 'test':
      return {
        title: t('notification.testTitle'),
        body: t('notification.testBody', { day: r.day, best: r.best }),
        startAction: false,
      };
    case 'rest':
      return {
        title: t('notification.restTitle'),
        body:
          r.nextDay === null || r.nextDay === r.day + 1
            ? t('notification.restBodyTomorrow')
            : t('notification.restBodyLater', { day: r.nextDay }),
        startAction: false,
      };
  }
}

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function permissionState(): PermissionState {
  return notificationsSupported() ? Notification.permission : 'unsupported';
}

/** Only call from a user action that explains why (the "Stay on track" prompt or the Settings toggle). */
export async function requestPermission(): Promise<PermissionState> {
  if (!notificationsSupported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function showNotification(content: NotificationContent, startLabel: string): Promise<void> {
  if (permissionState() !== 'granted') return;
  // `actions` only works for service-worker notifications and is missing from the DOM typings.
  const options: NotificationOptions & { actions?: { action: string; title: string }[] } = {
    body: content.body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: 'daily-reminder',
  };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      if (content.startAction) options.actions = [{ action: 'start', title: startLabel }];
      await reg.showNotification(content.title, options);
    } else {
      new Notification(content.title, options);
    }
  } catch (err) {
    console.warn('[pushup30] notification failed', err);
  }
}
