import { useState } from 'react';
import { formatSets } from '../../domain/plan';
import type { HistoryEntry } from '../../domain/progress';
import { useT } from '../../i18n/useT';
import { useApp } from '../../store/appStore';
import { DifficultyLabel } from '../adjust/DifficultyPicker';

const RECENT = 5;

/** Recent workouts, expandable to the full history. A row opens the day's detail. */
export function WorkoutHistory({ entries }: { entries: HistoryEntry[] }) {
  const { t } = useT();
  const openOverlay = useApp((s) => s.openOverlay);
  const [all, setAll] = useState(false);

  if (!entries.length) return <p className="muted">{t('history.empty')}</p>;
  const shown = all ? entries : entries.slice(0, RECENT);

  return (
    <>
      <ul className="history-list">
        {shown.map((e) => (
          <li key={e.day}>
            <button type="button" className={`history-row history-${e.kind}`} onClick={() => openOverlay({ kind: 'day', day: e.day })}>
              <span className="history-day">{t('common.day', { day: e.day })}</span>
              <span className="history-body">
                <EntryBody entry={e} />
              </span>
              <span className="history-chevron" aria-hidden="true">
                ›
              </span>
            </button>
          </li>
        ))}
      </ul>
      {entries.length > RECENT && (
        <button type="button" className="text-btn" onClick={() => setAll((v) => !v)}>
          {all ? t('history.showLess') : t('history.showAll', { count: entries.length })}
        </button>
      )}
    </>
  );
}

function EntryBody({ entry }: { entry: HistoryEntry }) {
  const { t } = useT();
  if (entry.kind === 'rest') return <span className="muted">{t('history.restDay')}</span>;
  if (entry.kind === 'test') {
    return (
      <>
        <strong>{t('dayType.test')}</strong>
        <span className="muted">{t('common.repsCount', { count: entry.reps })}</span>
      </>
    );
  }
  const { log, completion, adjusted } = entry.record;
  return (
    <>
      <strong>
        {formatSets(log.sets)} <span className="muted">· {t('common.repsCount', { count: log.totalReps })}</span>
      </strong>
      <span className="history-meta">
        {completion !== null && <span>{t('history.completedPct', { pct: Math.round(completion * 100) })}</span>}
        <DifficultyLabel difficulty={log.difficulty} />
        {adjusted && <span className="tag">{t('adjust.adjusted')}</span>}
      </span>
    </>
  );
}
