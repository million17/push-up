import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { estimateWorkoutMinutes, getPlanDay, totalTargetReps } from '../../domain/plan';
import { dateOfDay, dayStatus, isDayUnlocked } from '../../domain/schedule';
import { formatElapsed } from '../../domain/timer';
import { useToday } from '../../hooks/useToday';
import { describeDay, formatDate } from '../../i18n/format';
import { useT } from '../../i18n/useT';
import { unlockAudio } from '../../services/feedback';
import { useApp } from '../../store/appStore';

export function DayDetail({ day }: { day: number }) {
  const { t, lang } = useT();
  const data = useApp((s) => s.data);
  const { closeOverlay, startWorkout, startTest } = useApp.getState();
  const { todayDay } = useToday();
  const plan = getPlanDay(data.plan, day);
  if (!plan || !data.profile) return null;

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
        {plan.type === 'rest' && <p className="muted">{t('dayDetail.restBody')}</p>}

        {logs.length > 0 && (
          <ul className="history">
            {logs.map((l) => (
              <li key={l.id}>
                <span>{formatDate(lang, l.date)}</span>
                <span className="muted">{formatElapsed(l.durationSec * 1000)}</span>
                <strong>{t('common.repsCount', { count: l.totalReps })}</strong>
              </li>
            ))}
          </ul>
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
