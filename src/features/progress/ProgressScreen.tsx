import { Calendar } from '../../components/Calendar';
import { ProgressBar } from '../../components/ProgressBar';
import { Stat } from '../../components/Stat';
import { historyEntries, maxProgressPoints, milestones, progressSummary, workoutRecords } from '../../domain/progress';
import { challengeProgress, completedTrainingDays, computeStreak, totalReps } from '../../domain/stats';
import { workoutTime } from '../../domain/workoutTime';
import { useToday } from '../../hooks/useToday';
import { formatDate, formatTime } from '../../i18n/format';
import { useT } from '../../i18n/useT';
import { useApp } from '../../store/appStore';
import { MaxChart } from './MaxChart';
import { Milestones } from './Milestones';
import { VolumeChart } from './VolumeChart';
import { WorkoutHistory } from './WorkoutHistory';

/** Volume bars only say something once there are a few workouts to compare. */
const MIN_VOLUME_RECORDS = 2;

export function ProgressScreen() {
  const { t, lang } = useT();
  const data = useApp((s) => s.data);
  const openOverlay = useApp((s) => s.openOverlay);
  const { todayDay } = useToday();
  const progress = challengeProgress(data, todayDay);
  const streak = computeStreak(data, todayDay);
  const summary = progressSummary(data, todayDay);
  const points = maxProgressPoints(data);
  const records = workoutRecords(data);
  const imp = summary.improvement;

  return (
    <main className="screen">
      <header className="screen-header">
        <p className="eyebrow">{t('progress.title')}</p>
        <h1 className="day-title">
          {t('common.day', { day: Math.min(todayDay, data.plan.length) })}{' '}
          <span className="muted">/ {data.plan.length}</span>
        </h1>
      </header>

      <section className="card">
        <div className="summary-hero">
          <span className="stat-label">{t('progress.currentBest')}</span>
          <span className="hero-figure">
            {summary.currentBest} <span className="muted">{t('common.reps')}</span>
          </span>
          {summary.hasTests && (
            <span className={`delta ${imp.diff > 0 ? 'up' : ''}`}>
              {t('progress.improvementLine', { diff: imp.diff })}
              {imp.percent !== null && ` · +${Math.round(imp.percent)}%`}
            </span>
          )}
        </div>
        <div className="stat-grid">
          <Stat label={t('progress.startingMax')} value={summary.startingMax} />
          <Stat label={t('common.goal')} value={summary.goal} />
          {summary.hasTests ? (
            <Stat label={t('progress.improvement')} value={`+${imp.diff}`} />
          ) : (
            <Stat
              label={t('progress.nextTest')}
              value={summary.nextTestDay ? t('common.day', { day: summary.nextTestDay }) : '—'}
            />
          )}
          <Stat label={t('progress.toGoal')} value={summary.toGoal === 0 ? '🏆' : summary.toGoal} />
        </div>
        <div className="progress-row">
          <ProgressBar value={summary.goal ? summary.currentBest / summary.goal : 0} label={t('progress.goalProgress')} />
          <span className="progress-pct">{Math.min(100, Math.round((summary.currentBest / (summary.goal || 1)) * 100))}%</span>
        </div>
      </section>

      <section className="card">
        <div>
          <h2 className="card-title">{t('chart.maxTitle')}</h2>
          <p className="muted small">{t('chart.maxSubtitle')}</p>
        </div>
        {summary.hasTests ? (
          <>
            <MaxChart points={points} goal={summary.goal} planLength={data.plan.length} />
            <ul className="history" aria-label={t('progress.maxTests')}>
              {points.map((p) => (
                <li key={p.day}>
                  <span>{t('common.day', { day: p.day })}</span>
                  <span className="muted">
                    {p.kind === 'initial' ? t('progress.initial') : formatDate(lang, p.date)}
                  </span>
                  <strong>{p.reps}</strong>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="empty-state">
            {summary.nextTestDay
              ? t('chart.empty', { day: summary.nextTestDay, reps: summary.startingMax })
              : t('chart.emptyNoTest')}
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="card-title">{t('milestones.title')}</h2>
        <Milestones items={milestones(data)} />
      </section>

      <section className="card">
        <h2 className="card-title">{t('history.recent')}</h2>
        <WorkoutHistory entries={historyEntries(data, todayDay)} />
      </section>

      {records.length >= MIN_VOLUME_RECORDS && (
        <section className="card">
          <div>
            <h2 className="card-title">{t('chart.volumeTitle')}</h2>
            <p className="muted small">{t('chart.volumeSubtitle')}</p>
          </div>
          <VolumeChart records={records} planLength={data.plan.length} />
        </section>
      )}

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
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">{t('progress.calendar')}</h2>
        <Calendar data={data} todayDay={todayDay} onSelect={(day) => openOverlay({ kind: 'day', day })} />
      </section>
    </main>
  );
}
