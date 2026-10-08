import type { Milestone } from '../../domain/progress';
import { useT } from '../../i18n/useT';

const STEP_ICONS = ['💪', '🔥', '🚀', '⚡'];

export function Milestones({ items }: { items: Milestone[] }) {
  const { t } = useT();
  let step = 0;

  return (
    <ul className="milestones">
      {items.map((m) => {
        const i = m.kind === 'reps' ? step++ : -1;
        const icon = m.kind === 'started' ? '🏁' : m.kind === 'goal' ? '🏆' : STEP_ICONS[i % STEP_ICONS.length];
        const title =
          m.kind === 'started'
            ? t('milestones.started')
            : m.kind === 'goal'
              ? t('common.goal')
              : i === 0
                ? t('milestones.first', { count: m.reps })
                : t('milestones.reps', { count: m.reps });
        return (
          <li key={`${m.kind}-${m.reps}`} className={m.achieved ? 'achieved' : ''}>
            <span className="milestone-icon" aria-hidden="true">
              {icon}
            </span>
            <span className="milestone-body">
              <strong>{title}</strong>
              <span className="muted small">
                {m.achieved ? t('milestones.reachedOn', { day: m.day ?? 1 }) : t('milestones.notYet')}
              </span>
            </span>
            <span className="milestone-reps">{t('common.repsCount', { count: m.reps })}</span>
            <span className="milestone-mark" aria-label={m.achieved ? t('milestones.achieved') : t('milestones.notYet')}>
              {m.achieved ? '✓' : '○'}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
