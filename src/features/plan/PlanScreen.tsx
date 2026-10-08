import { useEffect, useRef } from 'react';
import { effectivePlanDay, isAdjusted } from '../../domain/adjustment';
import { totalTargetReps } from '../../domain/plan';
import { dateOfDay, dayStatus } from '../../domain/schedule';
import type { DayStatus } from '../../domain/types';
import { useToday } from '../../hooks/useToday';
import { describeDay, formatDate } from '../../i18n/format';
import { useT } from '../../i18n/useT';
import { useApp } from '../../store/appStore';

const MARK: Record<DayStatus, string> = {
  completed: '✓',
  today: '●',
  upcoming: '○',
  rest: '—',
  missed: '✕',
};

export function PlanScreen() {
  const { t, lang } = useT();
  const data = useApp((s) => s.data);
  const openOverlay = useApp((s) => s.openOverlay);
  const { todayDay } = useToday();
  const todayRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    todayRef.current?.scrollIntoView({ block: 'center' });
  }, []);

  if (!data.profile) return null;

  return (
    <main className="screen">
      <header className="screen-header">
        <p className="eyebrow">{t('plan.eyebrow')}</p>
        <h1 className="day-title">{t('plan.title')}</h1>
      </header>

      <ul className="plan-list">
        {data.plan.map((base) => {
          const d = effectivePlanDay(data, base.day) ?? base;
          const status = dayStatus(data, d, todayDay);
          return (
            <li key={d.day} ref={d.day === todayDay ? todayRef : undefined}>
              <button
                type="button"
                className={`plan-row plan-${status} plan-type-${d.type}`}
                onClick={() => openOverlay({ kind: 'day', day: d.day })}
              >
                <span className="plan-day">{d.day}</span>
                <span className="plan-body">
                  <span className="plan-what">{describeDay(t, d)}</span>
                  <span className="plan-meta">
                    {formatDate(lang, dateOfDay(data.profile!, d.day))}
                    {d.type === 'workout' && ` · ${t('common.repsCount', { count: totalTargetReps(d) })}`}
                    {isAdjusted(data, d.day) && ` · ${t('adjust.adjusted')}`}
                  </span>
                </span>
                <span className="plan-mark" aria-label={t(`dayStatus.${status}`)}>
                  {MARK[status]}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
