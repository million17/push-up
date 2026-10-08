import { useState } from 'react';
import { Button } from '../../components/Button';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { ProgressBar } from '../../components/ProgressBar';
import { Stat } from '../../components/Stat';
import { effectivePlanDay, isAdjusted } from '../../domain/adjustment';
import { estimateWorkoutMinutes, formatWorkout, totalTargetReps } from '../../domain/plan';
import { isChallengeOver, isDayCompleted, missedDays, nextTrainingDay } from '../../domain/schedule';
import { bestMax, completedTrainingDays, computeStreak, totalReps } from '../../domain/stats';
import type { AppData, WorkoutPlanDay } from '../../domain/types';
import { dayPart, isPastWorkoutTime, workoutTime } from '../../domain/workoutTime';
import { useNow } from '../../hooks/useNow';
import { useToday } from '../../hooks/useToday';
import { describeDay, formatTime } from '../../i18n/format';
import { useT } from '../../i18n/useT';
import { unlockAudio } from '../../services/feedback';
import { useApp } from '../../store/appStore';
import { ReminderPrompt } from '../reminder/ReminderPrompt';
import { useReminder } from '../reminder/useReminder';
import { TestIntro } from '../test/TestIntro';

/**
 * Morning-first: day number → today's workout (reps, time, START) → today's
 * progress → everything else.
 */
export function TodayScreen() {
  const { t } = useT();
  const data = useApp((s) => s.data);
  const { today, todayDay } = useToday();
  const now = useNow(30_000);
  const plan = effectivePlanDay(data, todayDay);
  const over = isChallengeOver(data, today) || !plan;

  return (
    <main className="screen">
      <header className="screen-header">
        <p className="eyebrow">{t(`today.greeting.${dayPart(now)}`)}</p>
        <h1 className="day-title">
          {t('common.day', { day: Math.min(todayDay, data.plan.length) })}{' '}
          <span className="muted">/ {data.plan.length}</span>
        </h1>
      </header>

      {over ? (
        <ChallengeOver data={data} />
      ) : plan.type === 'workout' ? (
        <WorkoutCard data={data} plan={plan} now={now} />
      ) : plan.type === 'rest' ? (
        <RestDayCard data={data} day={todayDay} />
      ) : (
        <TestIntro day={todayDay} />
      )}

      {!over && plan.type === 'workout' && <TodayProgress data={data} plan={plan} />}

      <UnfinishedBanner data={data} todayDay={todayDay} />
      <CatchUpBanner data={data} todayDay={todayDay} />
      {!over && <ScheduleCard data={data} />}

      <ReminderPrompt />
    </main>
  );
}

function WorkoutCard({ data, plan, now }: { data: AppData; plan: WorkoutPlanDay; now: number }) {
  const { t } = useT();
  const startWorkout = useApp((s) => s.startWorkout);
  const active = data.activeWorkout?.day === plan.day ? data.activeWorkout : null;
  const done = isDayCompleted(data, plan);
  const waiting = !done && !active && isPastWorkoutTime(workoutTime(data.settings), now);

  const start = () => {
    unlockAudio();
    startWorkout(plan.day);
  };

  return (
    <section className="card hero-card">
      <div className="card-head">
        <p className="eyebrow accent">{t('today.todaysWorkout')}</p>
        {isAdjusted(data, plan.day) && <span className="tag">{t('adjust.adjusted')}</span>}
      </div>
      <div className="hero-workout">
        <span className="hero-scheme">{formatWorkout(plan)}</span>
        <span className="hero-name">{t('common.pushUps')}</span>
      </div>

      <div className="hero-facts">
        <div>
          <span className="fact-value">{totalTargetReps(plan)}</span>
          <span className="fact-label">{t('today.totalReps')}</span>
        </div>
        <div>
          <span className="fact-value">{t('common.minutesApprox', { count: estimateWorkoutMinutes(plan, data.settings) })}</span>
          <span className="fact-label">{t('today.estimatedTime')}</span>
        </div>
      </div>

      {done && !active ? (
        <p className="done-note">{t('today.doneNote')}</p>
      ) : active ? (
        <p className="status-line">{t('today.inProgress', { done: active.completedSets.length, total: active.sets })}</p>
      ) : waiting ? (
        <div className="status-line status-waiting">
          <strong>{t('today.waitingTitle')}</strong>
          <span>{t('today.waitingBody')}</span>
        </div>
      ) : (
        <p className="status-line">{t('today.readyToStart')}</p>
      )}

      {done && !active ? (
        <Button variant="secondary" size="lg" block onClick={start}>
          {t('today.trainAgain')}
        </Button>
      ) : (
        <Button size="xl" block className="btn-hero" onClick={start}>
          {active ? t('today.resumeWorkout') : t('today.startWorkout')}
        </Button>
      )}
    </section>
  );
}

function TodayProgress({ data, plan }: { data: AppData; plan: WorkoutPlanDay }) {
  const { t } = useT();
  const active = data.activeWorkout?.day === plan.day ? data.activeWorkout : null;
  const setsDone = active ? active.completedSets.length : isDayCompleted(data, plan) ? plan.sets : 0;

  return (
    <section className="card">
      <div className="card-head">
        <h2 className="card-title">{t('today.todaysProgress')}</h2>
        <span className="progress-pct">
          {setsDone}/{plan.sets}
        </span>
      </div>
      <ProgressBar value={setsDone / plan.sets} label={t('today.setsCompleted')} />
      <ul className="set-list">
        {Array.from({ length: plan.sets }, (_, i) => {
          const isDone = i < setsDone;
          return (
            <li key={i} className={isDone ? 'done' : ''}>
              <span>{t('today.setN', { n: i + 1 })}</span>
              <span>{t('common.repsCount', { count: plan.reps })}</span>
              <span className="set-mark">{isDone ? '✓' : '○'}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RestDayCard({ data, day }: { data: AppData; day: number }) {
  const { t } = useT();
  const setTab = useApp((s) => s.setTab);
  const next = nextTrainingDay(data.plan, day);
  return (
    <section className="card rest-card">
      <h2>{t('today.recovery.title')}</h2>
      <p className="rest-lead">{t('today.recovery.noWorkout')}</p>
      <p className="muted">
        {t('today.recovery.body')}
        <br />
        {next &&
          (next.day === day + 1
            ? t('today.recovery.nextTomorrow')
            : t('today.recovery.nextOn', { day: next.day, what: describeDay(t, next) }))}
      </p>
      <Button variant="secondary" block onClick={() => setTab('plan')}>
        {t('today.recovery.viewPlan')}
      </Button>
    </section>
  );
}

/** "Workout time 06:30 AM · Every day", with the reminder state. Taps through to Settings. */
function ScheduleCard({ data }: { data: AppData }) {
  const { t, lang } = useT();
  const setTab = useApp((s) => s.setTab);
  const { isOn } = useReminder();
  return (
    <button type="button" className="card schedule-card" onClick={() => setTab('settings')}>
      <span className="schedule-main">
        <span className="stat-label">{t('today.workoutTime')}</span>
        <span className="schedule-time">{formatTime(lang, workoutTime(data.settings))}</span>
        <span className="muted small">{t('common.everyDay')}</span>
      </span>
      <span className={`pill ${isOn ? 'pill-on' : ''}`}>
        🔔 {isOn ? t('common.on') : t('common.off')}
      </span>
    </button>
  );
}

function ChallengeOver({ data }: { data: AppData }) {
  const { t } = useT();
  const resetChallenge = useApp((s) => s.resetChallenge);
  const [confirm, setConfirm] = useState(false);
  const streak = computeStreak(data, data.plan.length + 1);
  return (
    <section className="card">
      <h2>{t('today.finished.title')}</h2>
      <div className="stat-grid">
        <Stat label={t('today.finished.bestMax')} value={bestMax(data)} />
        <Stat label={t('today.finished.workouts')} value={completedTrainingDays(data)} />
        <Stat label={t('today.finished.totalReps')} value={totalReps(data)} />
        <Stat label={t('today.finished.longestStreak')} value={streak.longest} />
      </div>
      <Button size="xl" block onClick={() => setConfirm(true)}>
        {t('today.finished.startNew')}
      </Button>
      {confirm && (
        <ConfirmSheet
          title={t('today.finished.confirmTitle')}
          message={t('today.finished.confirmMessage')}
          confirmLabel={t('today.finished.confirmLabel')}
          danger
          onConfirm={resetChallenge}
          onCancel={() => setConfirm(false)}
        />
      )}
    </section>
  );
}

/** A workout left unfinished on another day (e.g. started on Day 9, now Day 11). */
function UnfinishedBanner({ data, todayDay }: { data: AppData; todayDay: number }) {
  const { t } = useT();
  const startWorkout = useApp((s) => s.startWorkout);
  const abandonWorkout = useApp((s) => s.abandonWorkout);
  const a = data.activeWorkout;
  if (!a || a.day === todayDay) return null;
  return (
    <div className="banner">
      <span>{t('today.unfinished.text', { day: a.day, done: a.completedSets.length, total: a.sets })}</span>
      <div className="banner-actions">
        <Button size="md" variant="ghost" onClick={abandonWorkout}>
          {t('today.unfinished.discard')}
        </Button>
        <Button size="md" onClick={() => (unlockAudio(), startWorkout(a.day))}>
          {t('today.unfinished.resume')}
        </Button>
      </div>
    </div>
  );
}

function CatchUpBanner({ data, todayDay }: { data: AppData; todayDay: number }) {
  const { t } = useT();
  const catchUp = useApp((s) => s.catchUp);
  const missed = missedDays(data, todayDay);
  if (!missed.length || todayDay > data.plan.length) return null;
  const first = missed[0];
  return (
    <div className="banner banner-warn">
      <span>
        {missed.length === 1
          ? t('today.catchUp.missedOne', { day: first.day })
          : t('today.catchUp.missedMany', { count: missed.length, day: first.day })}
      </span>
      <div className="banner-actions">
        <Button size="md" onClick={catchUp}>
          {t('today.catchUp.button')}
        </Button>
      </div>
    </div>
  );
}
