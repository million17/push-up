import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { Icon } from '../../components/Icon';
import { formatCountdown, formatElapsed, isPaused, remainingMs } from '../../domain/timer';
import type { ActiveWorkout, Settings } from '../../domain/types';
import { workoutElapsedMs } from '../../domain/workoutSession';
import { useNow } from '../../hooks/useNow';
import { useWakeLock } from '../../hooks/useWakeLock';
import { useT } from '../../i18n/useT';
import { beep, vibrate } from '../../services/feedback';
import { useApp } from '../../store/appStore';

const HEARTBEAT_MS = 30_000;

export function WorkoutScreen() {
  const { t } = useT();
  const session = useApp((s) => s.data.activeWorkout);
  const settings = useApp((s) => s.data.settings);
  const closeOverlay = useApp((s) => s.closeOverlay);
  const abandonWorkout = useApp((s) => s.abandonWorkout);
  const tick = useApp((s) => s.tick);
  const heartbeat = useApp((s) => s.heartbeat);
  const now = useNow(250);
  const [confirmExit, setConfirmExit] = useState(false);
  useWakeLock();

  // Auto-advance from rest to the next set.
  useEffect(() => {
    if (tick()) cue(settings, 'go');
  }, [now, tick, settings]);

  useEffect(() => {
    const id = window.setInterval(heartbeat, HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, [heartbeat]);

  useEffect(() => {
    if (!session) closeOverlay();
  }, [session, closeOverlay]);

  if (!session) return null;

  return (
    <div className="session">
      <header className="session-bar">
        <button type="button" className="icon-btn" aria-label={t('workout.exit')} onClick={() => setConfirmExit(true)}>
          <Icon name="close" />
        </button>
        <span className="session-title">{t('common.day', { day: session.day })}</span>
        <span className="session-clock" aria-label={t('workout.clock')}>
          {formatElapsed(workoutElapsedMs(session, now))}
        </span>
      </header>

      {session.phase === 'rest' && session.rest ? (
        <RestView session={session} now={now} />
      ) : (
        <SetView session={session} />
      )}

      <SetDots session={session} />

      {confirmExit && (
        <ConfirmSheet
          title={t('workout.leaveTitle')}
          message={t('workout.leaveMessage', { done: session.completedSets.length, total: session.sets })}
          confirmLabel={t('workout.saveExit')}
          cancelLabel={t('workout.keepTraining')}
          onConfirm={closeOverlay}
          onCancel={() => setConfirmExit(false)}
        >
          <Button variant="danger" block onClick={abandonWorkout}>
            {t('workout.discard')}
          </Button>
        </ConfirmSheet>
      )}
    </div>
  );
}

function SetView({ session }: { session: ActiveWorkout }) {
  const { t } = useT();
  const completeSet = useApp((s) => s.completeSet);
  const setIndex = session.completedSets.length;
  const [left, setLeft] = useState(session.reps);

  // New set → reset the counter.
  useEffect(() => setLeft(session.reps), [setIndex, session.reps]);

  const tap = () => {
    if (left <= 0) return;
    const next = left - 1;
    setLeft(next);
    vibrate(15);
    if (next === 0) completeSet();
  };

  return (
    <section className="session-main">
      <p className="phase-label">
        {t('workout.setN', { n: setIndex + 1 })} <span className="muted">/ {session.sets}</span>
      </p>
      <button type="button" className="rep-circle" onClick={tap} aria-label={t('workout.repsLeft', { count: left })}>
        <span className="rep-number">{left}</span>
        <span className="rep-unit">{left === session.reps ? t('workout.unitReps') : t('workout.unitToGo')}</span>
      </button>
      <p className="hint">{t('workout.hint')}</p>
      <Button size="xl" block onClick={completeSet}>
        <Icon name="check" /> {t('workout.doneSet')}
      </Button>
    </section>
  );
}

function RestView({ session, now }: { session: ActiveWorkout; now: number }) {
  const { t } = useT();
  const settings = useApp((s) => s.data.settings);
  const { skipRest, pauseRest, resumeRest, adjustRest } = useApp.getState();
  const rest = session.rest!;
  const left = remainingMs(rest, now);
  const paused = isPaused(rest);
  const progress = rest.durationMs ? 1 - left / rest.durationMs : 1;
  const nextSet = session.completedSets.length + 1;

  // 3-2-1 countdown beeps.
  const lastCue = useRef<number | null>(null);
  const secondsLeft = Math.ceil(left / 1000);
  useEffect(() => {
    if (paused || secondsLeft > 3 || secondsLeft < 1 || lastCue.current === secondsLeft) return;
    lastCue.current = secondsLeft;
    cue(settings, 'count');
  }, [secondsLeft, paused, settings]);

  return (
    <section className="session-main">
      <p className="phase-label rest-label">{t('rest.label')}</p>
      <div className={`rest-timer ${paused ? 'paused' : ''}`} aria-live="off">
        {formatCountdown(left)}
      </div>
      <div className="rest-progress">
        <div style={{ width: `${Math.min(100, progress * 100)}%` }} />
      </div>
      <p className="next-up">
        {t('rest.next')} <strong>{t('workout.setN', { n: nextSet })}</strong> — {t('common.repsCount', { count: session.reps })}
      </p>

      <div className="rest-controls">
        <button type="button" className="round-btn" onClick={() => adjustRest(-15)} aria-label={t('rest.minus15')}>
          −15s
        </button>
        <button
          type="button"
          className="round-btn round-btn-lg"
          onClick={paused ? resumeRest : pauseRest}
          aria-label={paused ? t('rest.resume') : t('rest.pause')}
        >
          <Icon name={paused ? 'play' : 'pause'} size={30} />
        </button>
        <button type="button" className="round-btn" onClick={() => adjustRest(15)} aria-label={t('rest.plus15')}>
          +15s
        </button>
      </div>

      <Button size="xl" variant="secondary" block onClick={skipRest}>
        {t('rest.skip')}
      </Button>
    </section>
  );
}

function SetDots({ session }: { session: ActiveWorkout }) {
  const { t } = useT();
  return (
    <div className="set-dots" aria-label={t('workout.setsDone', { done: session.completedSets.length, total: session.sets })}>
      {Array.from({ length: session.sets }, (_, i) => (
        <span
          key={i}
          className={i < session.completedSets.length ? 'done' : i === session.completedSets.length ? 'current' : ''}
        />
      ))}
    </div>
  );
}

function cue(settings: Settings, kind: 'count' | 'go') {
  if (settings.sound) kind === 'go' ? beep(1320, 400) : beep(880, 120);
  if (settings.vibration) vibrate(kind === 'go' ? [200, 100, 200] : 80);
}
