import { Calendar } from '../../components/Calendar';
import { ProgressBar } from '../../components/ProgressBar';
import { Stat } from '../../components/Stat';
import { bestMax, challengeProgress, completedTrainingDays, computeStreak, totalReps } from '../../domain/stats';
import { workoutTime } from '../../domain/workoutTime';
import { useToday } from '../../hooks/useToday';
import { formatDate, formatTime } from '../../i18n/format';
import { useT } from '../../i18n/useT';
import { useApp } from '../../store/appStore';

export function ProgressScreen() {
  const { t, lang } = useT();
  const data = useApp((s) => s.data);
  const openOverlay = useApp((s) => s.openOverlay);
  const { todayDay } = useToday();
  const progress = challengeProgress(data, todayDay);
  const streak = computeStreak(data, todayDay);

  return (
    <main className="screen">
      <header className="screen-header">
        <p className="eyebrow">{t('progress.eyebrow')}</p>
        <h1 className="day-title">
          {t('common.day', { day: Math.min(todayDay, data.plan.length) })}{' '}
          <span className="muted">/ {data.plan.length}</span>
        </h1>
      </header>

      <section className="card">
        <div className="progress-row">
          <ProgressBar value={progress} label={t('progress.challengeProgress')} />
          <span className="progress-pct">{Math.round(progress * 100)}%</span>
        </div>
        <div className="row">
          <span className="muted">{t('progress.workoutTime')}</span>
          <strong className="schedule-time-sm">{formatTime(lang, workoutTime(data.settings))}</strong>
        </div>
        <div className="stat-grid">
          <Stat label={t('progress.currentStreak')} value={`🔥 ${t('progress.streakDays', { count: streak.current })}`} />
          <Stat label={t('progress.totalWorkouts')} value={completedTrainingDays(data)} />
          <Stat label={t('progress.totalReps')} value={totalReps(data)} />
          <Stat label={t('progress.longestStreak')} value={t('progress.streakDays', { count: streak.longest })} />
          <Stat label={t('progress.bestMax')} value={bestMax(data)} />
          <Stat label={t('common.goal')} value={data.profile?.goal ?? '—'} />
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">{t('progress.calendar')}</h2>
        <Calendar data={data} todayDay={todayDay} onSelect={(day) => openOverlay({ kind: 'day', day })} />
      </section>

      {data.testResults.length > 0 && (
        <section className="card">
          <h2 className="card-title">{t('progress.maxTests')}</h2>
          <ul className="history">
            <li>
              <span>{t('progress.start')}</span>
              <span className="muted">{t('progress.initial')}</span>
              <strong>{data.profile?.initialMax}</strong>
            </li>
            {data.testResults.map((r) => (
              <li key={r.id}>
                <span>{t('common.day', { day: r.day })}</span>
                <span className="muted">{formatDate(lang, r.date)}</span>
                <strong>{r.reps}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
