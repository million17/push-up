import { dateKeyFromMs } from '../domain/dates';
import { currentDayNumber } from '../domain/schedule';
import type { DateKey } from '../domain/types';
import { useApp } from '../store/appStore';
import { useNow } from './useNow';

/** Today's date key and plan day; updates across midnight. */
export function useToday(): { today: DateKey; todayDay: number } {
  const today = dateKeyFromMs(useNow(30_000));
  const profile = useApp((s) => s.data.profile);
  return { today, todayDay: profile ? currentDayNumber(profile, today) : 1 };
}
