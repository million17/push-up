import { Button } from '../../components/Button';
import {
  adjustmentDecision,
  completionRate,
  isChallenging,
  plannedFor,
  recommendAdjustment,
  type Recommendation,
} from '../../domain/adjustment';
import { addDays } from '../../domain/dates';
import { formatWorkout } from '../../domain/plan';
import { dateOfDay } from '../../domain/schedule';
import type { WorkoutAdjustment } from '../../domain/types';
import { useToday } from '../../hooks/useToday';
import { useT } from '../../i18n/useT';
import { useApp } from '../../store/appStore';

interface Props {
  logId: string;
  /** Show "Today's workout was challenging…" when there is nothing to recommend (right after a workout). */
  showSupport?: boolean;
}

/**
 * After a workout: the open recommendation (apply / keep plan), the decision
 * already taken, or an encouraging note. Never changes the plan by itself.
 */
export function AdjustmentPanel({ logId, showSupport = false }: Props) {
  const { t } = useT();
  const data = useApp((s) => s.data);
  const log = data.workoutLogs.find((l) => l.id === logId);
  if (!log) return null;

  const decision = adjustmentDecision(data, logId);
  if (decision) return <DecisionNote decision={decision} />;

  const rec = recommendAdjustment(data, logId);
  if (rec) return <RecommendationCard rec={rec} />;

  const planned = plannedFor(data, log);
  if (showSupport && planned && isChallenging(completionRate(planned, log.totalReps), log.difficulty)) {
    return (
      <p className="support-note">
        {t('adjust.challengingTitle')} {t('adjust.consistency')}
      </p>
    );
  }
  return null;
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const { t } = useT();
  const decideAdjustment = useApp((s) => s.decideAdjustment);
  const label = useTargetLabel(rec.targetDay);
  const up = rec.direction === 'increase';

  return (
    <section className="card adjust-card" aria-live="polite">
      <p className="eyebrow accent">{t('adjust.recommended')}</p>
      <h2 className="adjust-title">{up ? t('adjust.easyTitle') : t('adjust.challengingTitle')}</h2>
      <p className="muted">{up ? t('adjust.easyBody') : t('adjust.challengingBody')}</p>
      {!up && <p className="muted small">{t('adjust.consistency')}</p>}

      <div className="adjust-compare">
        <span className="stat-label">{label}</span>
        <span className="adjust-from">{formatWorkout(rec.original)}</span>
        <span className="adjust-arrow" aria-label={t('adjust.changesTo')}>
          ↓
        </span>
        <span className="adjust-to">{formatWorkout(rec.recommended)}</span>
      </div>

      <div className="stack">
        <Button block onClick={() => decideAdjustment(rec.sourceLogId, true)}>
          {up ? t('adjust.apply') : t('adjust.applyAdjustment')}
        </Button>
        <Button variant="ghost" block onClick={() => decideAdjustment(rec.sourceLogId, false)}>
          {t('adjust.keepPlan')}
        </Button>
      </div>
    </section>
  );
}

function DecisionNote({ decision }: { decision: WorkoutAdjustment }) {
  const { t } = useT();
  return (
    <p className={`decision-note ${decision.applied ? 'applied' : ''}`} role="status">
      {decision.applied
        ? t('adjust.appliedNote', { day: decision.day, scheme: formatWorkout(decision.adjustedPlan) })
        : t('adjust.keptNote', { day: decision.day, scheme: formatWorkout(decision.originalPlan) })}
    </p>
  );
}

/** "Tomorrow" when the adjusted day is tomorrow, else "Day 12". */
function useTargetLabel(day: number): string {
  const { t } = useT();
  const profile = useApp((s) => s.data.profile);
  const { today } = useToday();
  if (profile && dateOfDay(profile, day) === addDays(today, 1)) return t('adjust.tomorrow');
  return t('common.day', { day });
}
