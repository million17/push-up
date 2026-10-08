import { Button } from '../../components/Button';
import { ProgressBar } from '../../components/ProgressBar';
import { Stat } from '../../components/Stat';
import { completionRate, plannedFor } from '../../domain/adjustment';
import { totalTargetReps } from '../../domain/plan';
import { challengeProgress, computeStreak } from '../../domain/stats';
import { formatElapsed } from '../../domain/timer';
import { useToday } from '../../hooks/useToday';
import { useT } from '../../i18n/useT';
import { useApp } from '../../store/appStore';
import { AdjustmentPanel } from '../adjust/AdjustmentPanel';
import { DifficultyPicker } from '../adjust/DifficultyPicker';

export function WorkoutComplete({ logId }: { logId: string }) {
  const { t } = useT();
  const data = useApp((s) => s.data);
  const closeOverlay = useApp((s) => s.closeOverlay);
  const { todayDay } = useToday();
  const log = data.workoutLogs.find((l) => l.id === logId);
  if (!log) return null;

  const planned = plannedFor(data, log);
  const target = planned ? totalTargetReps(planned) : log.totalReps;
  const completion = planned ? completionRate(planned, log.totalReps) : 1;
  const streak = computeStreak(data, todayDay);
  const progress = challengeProgress(data, todayDay);

  return (
    <div className="session session-complete">
      <section className="session-main">
        <p className="celebrate" aria-hidden="true">
          {log.totalReps > 0 ? '🎉' : '🌱'}
        </p>
        <h1 className="display">{log.totalReps > 0 ? t('complete.title') : t('complete.savedTitle')}</h1>
        <p className="muted">
          {log.totalReps > 0 ? t('complete.dayCompleted', { day: log.day }) : t('complete.savedBody', { day: log.day })}
        </p>

        <p className="big-reps">
          {log.totalReps} <span className="muted">/ {target} {t('common.reps')}</span>
        </p>
        <p className="completion-line">{t('complete.completedPct', { pct: Math.round(completion * 100) })}</p>

        <div className="stat-grid">
          <Stat label={t('complete.time')} value={formatElapsed(log.durationSec * 1000)} />
          <Stat label={t('complete.sets')} value={log.sets.length} />
          <Stat label={t('complete.streak')} value={`🔥 ${streak.current}`} />
          <Stat label={t('complete.challenge')} value={`${Math.round(progress * 100)}%`} />
        </div>
        <ProgressBar value={progress} label={t('complete.progress')} />

        <DifficultyPicker log={log} />
        <AdjustmentPanel logId={log.id} showSupport />
      </section>

      <Button size="xl" block onClick={closeOverlay}>
        {t('common.done')}
      </Button>
    </div>
  );
}
