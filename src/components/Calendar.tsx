import { addDays, parseDateKey, weekdayMondayFirst } from '../domain/dates';
import { dayStatus } from '../domain/schedule';
import type { AppData, DayStatus } from '../domain/types';
import { LOCALES } from '../i18n/i18n';
import { useT } from '../i18n/useT';

const SYMBOL: Record<DayStatus, string> = {
  completed: '✓',
  upcoming: '○',
  rest: '—',
  today: '●',
  missed: '✕',
};

const LEGEND: DayStatus[] = ['completed', 'today', 'upcoming', 'rest', 'missed'];

interface Props {
  data: AppData;
  todayDay: number;
  onSelect(day: number): void;
}

/** Week grid (Mon–Sun) of the challenge days; the current day is highlighted. */
export function Calendar({ data, todayDay, onSelect }: Props) {
  const { t, lang } = useT();
  if (!data.profile) return null;
  const start = data.profile.startDate;
  const leading = weekdayMondayFirst(start);
  // Any Monday-first week works for the header labels.
  const weekStart = addDays(start, -leading);
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    parseDateKey(addDays(weekStart, i)).toLocaleDateString(LOCALES[lang], { weekday: 'narrow' }),
  );

  return (
    <div>
      <div className="calendar">
        {weekdays.map((w, i) => (
          <span key={`w${i}`} className="cal-weekday" aria-hidden="true">
            {w}
          </span>
        ))}
        {Array.from({ length: leading }, (_, i) => (
          <span key={`b${i}`} aria-hidden="true" />
        ))}
        {data.plan.map((d) => {
          const status = dayStatus(data, d, todayDay);
          const isToday = d.day === todayDay;
          return (
            <button
              key={d.day}
              type="button"
              className={`cal-day cal-${status} ${isToday ? 'cal-is-today' : ''} ${d.type === 'test' ? 'cal-test' : ''}`}
              aria-label={t('progress.calendarDay', {
                day: d.day,
                type: t(`dayType.${d.type}`),
                status: t(`dayStatus.${status}`),
              })}
              aria-current={isToday ? 'date' : undefined}
              onClick={() => onSelect(d.day)}
            >
              <span className="cal-num">{d.day}</span>
              <span className="cal-sym">{SYMBOL[status]}</span>
            </button>
          );
        })}
      </div>
      <div className="cal-legend muted">
        {LEGEND.map((s) => (
          <span key={s}>{t(`progress.legend.${s}`)}</span>
        ))}
      </div>
    </div>
  );
}
