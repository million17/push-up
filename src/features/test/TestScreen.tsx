import { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { Icon } from '../../components/Icon';
import { testElapsedMs } from '../../domain/testSession';
import { formatElapsed } from '../../domain/timer';
import { useNow } from '../../hooks/useNow';
import { useWakeLock } from '../../hooks/useWakeLock';
import { useT } from '../../i18n/useT';
import { vibrate } from '../../services/feedback';
import { useApp } from '../../store/appStore';

export function TestScreen() {
  const { t } = useT();
  const session = useApp((s) => s.data.activeTest);
  const vibration = useApp((s) => s.data.settings.vibration);
  const { addTestReps, finishTest, abandonTest, closeOverlay, heartbeat } = useApp.getState();
  const now = useNow(200);
  const [confirmExit, setConfirmExit] = useState(false);
  useWakeLock();

  useEffect(() => {
    const id = window.setInterval(heartbeat, 30_000);
    return () => window.clearInterval(id);
  }, [heartbeat]);

  useEffect(() => {
    if (!session) closeOverlay();
  }, [session, closeOverlay]);

  if (!session) return null;

  const plusOne = () => {
    addTestReps(1);
    if (vibration) vibrate(15);
  };

  return (
    <div className="session">
      <header className="session-bar">
        <button type="button" className="icon-btn" aria-label={t('test.exit')} onClick={() => setConfirmExit(true)}>
          <Icon name="close" />
        </button>
        <span className="session-title">{t('test.sessionTitle', { day: session.day })}</span>
        <span className="session-clock" aria-label={t('test.stopwatch')}>
          {formatElapsed(testElapsedMs(session, now))}
        </span>
      </header>

      <section className="session-main">
        <div className="test-count" aria-live="polite">
          <span className="rep-number">{session.reps}</span>
          <span className="rep-unit">{t('workout.unitReps')}</span>
        </div>
        <button type="button" className="plus-one" onClick={plusOne}>
          {t('test.plusOne')}
        </button>
        <button
          type="button"
          className="undo-link"
          onClick={() => addTestReps(-1)}
          disabled={session.reps === 0}
        >
          {t('test.undo')}
        </button>
      </section>

      <Button size="xl" variant="secondary" block onClick={finishTest} disabled={session.reps === 0}>
        {t('test.finish')}
      </Button>

      {confirmExit && (
        <ConfirmSheet
          title={t('test.leaveTitle')}
          message={t('test.leaveMessage')}
          confirmLabel={t('test.saveExit')}
          cancelLabel={t('test.keepGoing')}
          onConfirm={closeOverlay}
          onCancel={() => setConfirmExit(false)}
        >
          <Button variant="danger" block onClick={abandonTest}>
            {t('test.discard')}
          </Button>
        </ConfirmSheet>
      )}
    </div>
  );
}
