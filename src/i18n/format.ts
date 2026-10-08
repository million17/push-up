import { formatLongDate } from '../domain/dates';
import { formatWorkout } from '../domain/plan';
import type { DateKey, Language, PlanDay, TimeOfDay } from '../domain/types';
import { LOCALES, type TFunction } from './i18n';

/** "06:30 AM" in English, "06:30" in Vietnamese. */
export function formatTime(lang: Language, t: TimeOfDay): string {
  return new Date(2000, 0, 1, t.hour, t.minute).toLocaleTimeString(LOCALES[lang], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(lang: Language, key: DateKey): string {
  return formatLongDate(key, LOCALES[lang]);
}

/** "4 × 10 push-ups" / "Max test" / "Rest". */
export function describeDay(t: TFunction, d: PlanDay): string {
  if (d.type === 'workout') return t('dayType.workoutDesc', { scheme: formatWorkout(d) });
  if (d.type === 'test') return t('dayType.test');
  return t('dayType.rest');
}
