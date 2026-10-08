import { Button } from '../../components/Button';
import { isDayCompleted } from '../../domain/schedule';
import { bestMax } from '../../domain/stats';
import { useT } from '../../i18n/useT';
import { unlockAudio } from '../../services/feedback';
import { useApp } from '../../store/appStore';

/** The "MAX PUSH-UP TEST" card shown on test days. */
export function TestIntro({ day }: { day: number }) {
  const { t } = useT();
  const data = useApp((s) => s.data);
  const startTest = useApp((s) => s.startTest);
  const plan = data.plan.find((d) => d.day === day);
  const done = !!plan && isDayCompleted(data, plan);
  const resuming = data.activeTest?.day === day;
  const latest = [...data.testResults].reverse().find((r) => r.day === day);

  return (
    <section className="card hero-card test-card">
      <p className="eyebrow accent">{t('test.title')}</p>
      <div className="test-compare">
        <div>
          <span className="stat-label">{t('test.previousBest')}</span>
          <span className="stat-value">{bestMax(data)}</span>
          <span className="stat-label">{t('common.reps')}</span>
        </div>
        <div>
          <span className="stat-label">{t('common.goal')}</span>
          <span className="stat-value">{data.profile?.goal}</span>
          <span className="stat-label">{t('common.reps')}</span>
        </div>
      </div>
      <p className="muted">{t('test.instructions')}</p>
      {done && latest && <p className="done-note">{t('test.testedToday', { count: latest.reps })}</p>}
      <Button
        size="xl"
        variant={done && !resuming ? 'secondary' : 'primary'}
        block
        onClick={() => {
          unlockAudio();
          startTest(day);
        }}
      >
        {resuming ? t('test.resume') : done ? t('test.again') : t('test.start')}
      </Button>
    </section>
  );
}
