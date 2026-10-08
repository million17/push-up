import { useState } from 'react';
import type { MaxPoint } from '../../domain/progress';
import { formatDate } from '../../i18n/format';
import { useT } from '../../i18n/useT';
import { CHART_W, PAD, dayTicks, xForDay, yScale } from './chartScale';

const H = 200;

interface Props {
  points: MaxPoint[];
  goal: number;
  planLength: number;
}

/**
 * Max push-ups over the challenge: one marker per real result (starting max,
 * each Max Test), joined in day order. Nothing is drawn for days not tested yet.
 */
export function MaxChart({ points, goal, planLength }: Props) {
  const { t, lang } = useT();
  const [selected, setSelected] = useState(points.length - 1);
  const sel = points[Math.min(selected, points.length - 1)];

  const { top, ticks } = yScale(Math.max(goal, ...points.map((p) => p.reps)));
  const y = (reps: number) => PAD.top + (1 - reps / top) * (H - PAD.top - PAD.bottom);
  const x = (day: number) => xForDay(day, planLength);
  const line = points.map((p) => `${x(p.day)},${y(p.reps)}`).join(' ');
  const describe = (p: MaxPoint) =>
    [
      t('common.day', { day: p.day }),
      p.kind === 'initial' ? t('progress.startingMax') : t('dayType.test'),
      t('common.repsCount', { count: p.reps }),
    ].join(' · ');

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${CHART_W} ${H}`} role="group" aria-label={t('chart.maxTitle')}>
        {ticks.map((v) => (
          <g key={v}>
            <line className="chart-grid" x1={PAD.left} x2={CHART_W - PAD.right} y1={y(v)} y2={y(v)} />
            <text className="chart-tick" x={PAD.left - 6} y={y(v)} textAnchor="end" dominantBaseline="middle">
              {v}
            </text>
          </g>
        ))}
        {dayTicks(planLength).map((d) => (
          <text key={d} className="chart-tick" x={x(d)} y={H - 6} textAnchor="middle">
            {d}
          </text>
        ))}

        <line className="chart-goal" x1={PAD.left} x2={CHART_W - PAD.right} y1={y(goal)} y2={y(goal)} />
        <text className="chart-goal-label" x={CHART_W - PAD.right} y={y(goal) - 5} textAnchor="end">
          {t('common.goal')} {goal}
        </text>

        {points.length > 1 && <polyline className="chart-line" points={line} />}

        {points.map((p, i) => {
          const labelled = i === 0 || i === points.length - 1 || i === selected;
          return (
            <g
              key={p.day}
              className={`chart-point ${i === selected ? 'selected' : ''}`}
              tabIndex={0}
              role="button"
              aria-label={describe(p)}
              aria-pressed={i === selected}
              onClick={() => setSelected(i)}
              onFocus={() => setSelected(i)}
              onPointerEnter={() => setSelected(i)}
            >
              <circle className="chart-hit" cx={x(p.day)} cy={y(p.reps)} r={16} />
              <circle className="chart-dot" cx={x(p.day)} cy={y(p.reps)} r={i === selected ? 6 : 5} />
              {labelled && (
                <text className="chart-value" x={x(p.day)} y={y(p.reps) - 12} textAnchor="middle">
                  {p.reps}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="chart-readout" aria-live="polite">
        {describe(sel)} <span className="muted">· {formatDate(lang, sel.date)}</span>
      </figcaption>
    </figure>
  );
}
