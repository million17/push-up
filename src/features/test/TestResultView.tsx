import { Button } from '../../components/Button';
import { improvement } from '../../domain/testSession';
import { formatElapsed } from '../../domain/timer';
import { useT } from '../../i18n/useT';
import { useApp } from '../../store/appStore';

export function TestResultView({ resultId }: { resultId: string }) {
  const { t } = useT();
  const data = useApp((s) => s.data);
  const closeOverlay = useApp((s) => s.closeOverlay);
  const result = data.testResults.find((r) => r.id === resultId);
  if (!result) return null;

  const imp = improvement(result.previousBest, result.reps);
  const goal = data.profile?.goal ?? 0;
  const better = imp.diff > 0;

  return (
    <div className="session session-complete">
      <section className="session-main">
        <p className="celebrate" aria-hidden="true">
          {result.reps >= goal ? '🏆' : better ? '💪' : '👊'}
        </p>
        <p className="eyebrow">{t('test.sessionTitle', { day: result.day })}</p>
        <p className="big-reps">
          {result.reps} <span className="muted">{t('common.reps')}</span>
        </p>

        <p className="compare-line">
          {imp.from} → {imp.to}
        </p>
        <p className={`delta ${better ? 'up' : imp.diff < 0 ? 'down' : ''}`}>
          {imp.diff >= 0 ? '+' : '−'}
          {t('common.repsCount', { count: Math.abs(imp.diff) })}
          {imp.percent !== null && (
            <>
              {' · '}
              {imp.percent >= 0 ? '+' : ''}
              {imp.percent}%
            </>
          )}
        </p>

        <p className="muted">
          {result.reps >= goal ? t('test.goalReached', { goal }) : t('test.toGo', { left: goal - result.reps, goal })}
          {' · '}
          {formatElapsed(result.durationSec * 1000)}
        </p>
      </section>

      <Button size="xl" block onClick={closeOverlay}>
        {t('common.done')}
      </Button>
    </div>
  );
}
