import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { appliedAdjustment, effectivePlanDay, latestLog } from '../../domain/adjustment';
import { estimateWorkoutMinutes, formatSets, formatWorkout, getPlanDay, totalTargetReps } from '../../domain/plan';
import { workoutRecord } from '../../domain/progress';
import { dateOfDay, dayStatus, isDayUnlocked } from '../../domain/schedule';
import { formatElapsed } from '../../domain/timer';
import { useToday } from '../../hooks/useToday';
import { describeDay, formatDate } from '../../i18n/format';
import { useT } from '../../i18n/useT';
import { unlockAudio } from '../../services/feedback';
import { useApp } from '../../store/appStore';
import { AdjustmentPanel } from '../adjust/AdjustmentPanel';
import { DifficultyLabel } from '../adjust/DifficultyPicker';

export function DayDetail({ day }: { day: number }) {
  const { t, lang } = useT();
  const data = useApp((s) => s.data);
  const { closeOverlay, startWorkout, startTest } = useApp.getState();
  const { todayDay } = useToday();
  const plan = effectivePlanDay(data, day);
  if (!plan || !data.profile) return null;
  const base = getPlanDay(data.plan, day);
  const adjustment = appliedAdjustment(data, day);
  const latest = latestLog(data, day);
  const history = data.adjustments.filter((a) => a.day === day);

  const status = dayStatus(data, plan, todayDay);
  const unlocked = isDayUnlocked(day, todayDay);
  const logs = data.workoutLogs.filter((l) => l.day === day);
  const tests = data.testResults.filter((r) => r.day === day);
  const done = status === 'completed';

  const start = () => {
    unlockAudio();
    if (plan.type === 'workout') startWorkout(day);
    else startTest(day);
  };

  return (
    <div className="session day-detail">
      <header className="session-bar">
        <button type="button" className="icon-btn" aria-label={t('common.back')} onClick={closeOverlay}>
          <Icon name="back" />
        </button>
        <span className="session-title">{t('common.day', { day })}</span>
        <span />
      </header>

      <section className="day-detail-main">
        <p className="eyebrow">
          {formatDate(lang, dateOfDay(data.profile, day))} · <span className={`status-${status}`}>{t(`dayStatus.${status}`)}</span>
        </p>
        <h1 className="display">{plan.type === 'rest' ? t('dayDetail.recoveryTitle') : describeDay(t, plan)}</h1>
        {plan.type === 'workout' && (
          <p className="muted">
            {t('dayDetail.setsOfReps', { sets: plan.sets, reps: plan.reps, total: totalTargetReps(plan) })} ·{' '}
            {t('common.minutesApprox', { count: estimateWorkoutMinutes(plan, data.settings) })}
          </p>
        )}
        {adjustment && base?.type === 'workout' && (
          <p className="adjust-tag">{t('adjust.adjustedFrom', { scheme: formatWorkout(base) })}</p>
        )}
        {plan.type === 'rest' && <p className="muted">{t('dayDetail.restBody')}</p>}

        {latest && <AdjustmentPanel logId={latest.id} />}

        {logs.length > 0 && (
          <ul className="log-list">
            {[...logs].reverse().map((l) => {
              const r = workoutRecord(data, l);
              return (
                <li key={l.id} className="log-card">
                  <div className="log-head">
                    <strong>{formatDate(lang, l.date)}</strong>
                    <span className="muted">{formatElapsed(l.durationSec * 1000)}</span>
                  </div>
                  <dl className="log-facts">
                    {r.base && (
                      <div>
                        <dt>{t('history.planned')}</dt>
                        <dd>{formatWorkout(r.base)}</dd>
                      </div>
                    )}
                    <div>
                      <dt>{t('adjust.adjusted')}</dt>
                      <dd>{r.adjusted && r.planned ? t('history.adjustedYes', { scheme: formatWorkout(r.planned) }) : t('history.no')}</dd>
                    </div>
                    <div>
                      <dt>{t('history.actual')}</dt>
                      <dd>{l.sets.length ? formatSets(l.sets) : '—'}</dd>
                    </div>
                    <div>
                      <dt>{t('history.total')}</dt>
                      <dd>
                        {t('common.repsCount', { count: l.totalReps })}
                        {r.completion !== null && ` · ${Math.round(r.completion * 100)}%`}
                      </dd>
                    </div>
                    <div>
                      <dt>{t('history.difficulty')}</dt>
                      <dd>{l.difficulty ? <DifficultyLabel difficulty={l.difficulty} /> : <span className="muted">{t('history.skipped')}</span>}</dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ul>
        )}

        {history.length > 0 && (
          <section className="adjust-history">
            <h2 className="card-title">{t('adjust.history')}</h2>
            <ul className="history">
              {history.map((a) => (
                <li key={a.id}>
                  <span>
                    {formatWorkout(a.originalPlan)} → {formatWorkout(a.adjustedPlan)}
                    <span className="muted small block">
                      {t('adjust.fromDay', { day: a.sourceDay })} · {t(`adjust.reason.${a.reason}`)}
                    </span>
                  </span>
                  <span />
                  <strong className={a.applied ? 'accent' : 'muted'}>{a.applied ? t('adjust.applied') : t('adjust.kept')}</strong>
                </li>
              ))}
            </ul>
          </section>
        )}
        {tests.length > 0 && (
          <ul className="history">
            {tests.map((r) => (
              <li key={r.id}>
                <span>{formatDate(lang, r.date)}</span>
                <span className="muted">{formatElapsed(r.durationSec * 1000)}</span>
                <strong>{t('common.repsCount', { count: r.reps })}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>

      {plan.type !== 'rest' &&
        (unlocked ? (
          <Button size="xl" variant={done ? 'secondary' : 'primary'} block onClick={start}>
            {plan.type === 'test'
              ? t(done ? 'dayDetail.testAgain' : 'dayDetail.startTest')
              : t(done ? 'dayDetail.trainAgain' : 'dayDetail.startWorkout')}
          </Button>
        ) : (
          <p className="muted center">{t('dayDetail.unlocksOn', { date: formatDate(lang, dateOfDay(data.profile, day)) })}</p>
        ))}
    </div>
  );
}
