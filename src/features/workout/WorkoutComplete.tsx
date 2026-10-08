import { Button } from '../../components/Button';
import { ProgressBar } from '../../components/ProgressBar';
import { Stat } from '../../components/Stat';
import { getPlanDay, totalTargetReps } from '../../domain/plan';
import { challengeProgress, computeStreak } from '../../domain/stats';
import { formatElapsed } from '../../domain/timer';
import { useToday } from '../../hooks/useToday';
import { useT } from '../../i18n/useT';
import { useApp } from '../../store/appStore';

export function WorkoutComplete({ logId }: { logId: string }) {
  const { t } = useT();
  const data = useApp((s) => s.data);
  const closeOverlay = useApp((s) => s.closeOverlay);
  const { todayDay } = useToday();
  const log = data.workoutLogs.find((l) => l.id === logId);
  if (!log) return null;

  const plan = getPlanDay(data.plan, log.day);
  const target = plan?.type === 'workout' ? totalTargetReps(plan) : log.totalReps;
  const streak = computeStreak(data, todayDay);
  const progress = challengeProgress(data, todayDay);

  return (
    <div className="session session-complete">
      <section className="session-main">
        <p className="celebrate" aria-hidden="true">
          🎉
        </p>
        <h1 className="display">{t('complete.title')}</h1>
        <p className="muted">{t('complete.dayCompleted', { day: log.day })}</p>

        <p className="big-reps">
          {log.totalReps} <span className="muted">/ {target} {t('common.reps')}</span>
        </p>

        <div className="stat-grid">
          <Stat label={t('complete.time')} value={formatElapsed(log.durationSec * 1000)} />
          <Stat label={t('complete.sets')} value={log.sets.length} />
          <Stat label={t('complete.streak')} value={`🔥 ${streak.current}`} />
          <Stat label={t('complete.challenge')} value={`${Math.round(progress * 100)}%`} />
        </div>
        <ProgressBar value={progress} label={t('complete.progress')} />
      </section>

      <Button size="xl" block onClick={closeOverlay}>
        {t('common.done')}
      </Button>
    </div>
  );
}
