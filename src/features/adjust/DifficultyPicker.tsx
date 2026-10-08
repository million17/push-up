import type { Difficulty, WorkoutLog } from '../../domain/types';
import { useT } from '../../i18n/useT';
import { useApp } from '../../store/appStore';

export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'good', 'hard', 'very_hard'];

export const DIFFICULTY_EMOJI: Record<Difficulty, string> = {
  easy: '😄',
  good: '🙂',
  hard: '😐',
  very_hard: '🥵',
};

/** "How was today's workout?" — optional; tapping the selected answer clears it. */
export function DifficultyPicker({ log }: { log: WorkoutLog }) {
  const { t } = useT();
  const rateWorkout = useApp((s) => s.rateWorkout);

  return (
    <section className="feedback">
      <h2 className="card-title" id="difficulty-q">
        {t('difficulty.question')}
      </h2>
      <div className="difficulty-chips" role="radiogroup" aria-labelledby="difficulty-q">
        {DIFFICULTIES.map((d) => {
          const on = log.difficulty === d;
          return (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={on}
              className={`difficulty-chip ${on ? 'on' : ''}`}
              onClick={() => rateWorkout(log.id, on ? null : d)}
            >
              <span className="difficulty-emoji" aria-hidden="true">
                {DIFFICULTY_EMOJI[d]}
              </span>
              <span>{t(`difficulty.${d}`)}</span>
            </button>
          );
        })}
      </div>
      <p className="muted small">{t('difficulty.optional')}</p>
    </section>
  );
}

/** "🥵 Very hard", or null when skipped. */
export function DifficultyLabel({ difficulty }: { difficulty?: Difficulty }) {
  const { t } = useT();
  if (!difficulty) return null;
  return (
    <span className="difficulty-label">
      <span aria-hidden="true">{DIFFICULTY_EMOJI[difficulty]}</span> {t(`difficulty.${difficulty}`)}
    </span>
  );
}
