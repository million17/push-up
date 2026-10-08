import { useState } from 'react';
import type { WorkoutRecord } from '../../domain/progress';
import { useT } from '../../i18n/useT';
import { CHART_W, PAD, dayTicks, xForDay, yScale } from './chartScale';

const H = 150;
const MAX_BAR_W = 24;
const RADIUS = 4;

/** Total reps actually done per workout day (the day's latest attempt). */
export function VolumeChart({ records, planLength }: { records: WorkoutRecord[]; planLength: number }) {
  const { t } = useT();
  const [selected, setSelected] = useState(records.length - 1);
  const sel = records[Math.min(selected, records.length - 1)];

  const { top, ticks } = yScale(Math.max(1, ...records.map((r) => r.log.totalReps)));
  const baseline = H - PAD.bottom;
  const y = (reps: number) => PAD.top + (1 - reps / top) * (baseline - PAD.top);
  const slot = (CHART_W - PAD.left - PAD.right) / Math.max(1, planLength - 1);
  const barW = Math.max(4, Math.min(MAX_BAR_W, slot - 2));
  const describe = (r: WorkoutRecord) =>
    [
      t('common.day', { day: r.day }),
      r.planned
        ? t('chart.volumeOfPlanned', { done: r.log.totalReps, planned: r.planned.sets * r.planned.reps })
        : t('common.repsCount', { count: r.log.totalReps }),
      r.completion !== null ? `${Math.round(r.completion * 100)}%` : null,
    ]
      .filter(Boolean)
      .join(' · ');

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${CHART_W} ${H}`} role="group" aria-label={t('chart.volumeTitle')}>
        {ticks.map((v) => (
          <g key={v}>
            <line className="chart-grid" x1={PAD.left} x2={CHART_W - PAD.right} y1={y(v)} y2={y(v)} />
            <text className="chart-tick" x={PAD.left - 6} y={y(v)} textAnchor="end" dominantBaseline="middle">
              {v}
            </text>
          </g>
        ))}
        {dayTicks(planLength).map((d) => (
          <text key={d} className="chart-tick" x={xForDay(d, planLength)} y={H - 6} textAnchor="middle">
            {d}
          </text>
        ))}

        {records.map((r, i) => {
          const cx = xForDay(r.day, planLength);
          const h = baseline - y(r.log.totalReps);
          return (
            <g
              key={r.day}
              className={`chart-bar ${i === selected ? 'selected' : ''}`}
              tabIndex={0}
              role="button"
              aria-label={describe(r)}
              aria-pressed={i === selected}
              onClick={() => setSelected(i)}
              onFocus={() => setSelected(i)}
              onPointerEnter={() => setSelected(i)}
            >
              <rect className="chart-hit" x={cx - slot / 2} y={PAD.top} width={slot} height={baseline - PAD.top} />
              {h > 0 && <path className="chart-bar-fill" d={columnPath(cx - barW / 2, baseline, barW, h)} />}
            </g>
          );
        })}
        <line className="chart-axis" x1={PAD.left} x2={CHART_W - PAD.right} y1={baseline} y2={baseline} />
      </svg>
      <figcaption className="chart-readout" aria-live="polite">
        {describe(sel)}
      </figcaption>
    </figure>
  );
}

/** Column with a rounded data end and a square foot on the baseline. */
function columnPath(x: number, baseline: number, w: number, h: number): string {
  const r = Math.min(RADIUS, w / 2, h);
  const top = baseline - h;
  return [
    `M${x},${baseline}`,
    `V${top + r}`,
    `Q${x},${top} ${x + r},${top}`,
    `H${x + w - r}`,
    `Q${x + w},${top} ${x + w},${top + r}`,
    `V${baseline}`,
    'Z',
  ].join(' ');
}
