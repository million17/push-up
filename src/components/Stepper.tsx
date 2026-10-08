import { useEffect, useState } from 'react';
import { useT } from '../i18n/useT';

interface Props {
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  label: string;
  onChange(v: number): void;
}

export function Stepper({ value, min, max, step = 1, suffix, label, onChange }: Props) {
  const { t } = useT();
  // Free typing is kept as a draft and clamped on blur, so "45" can be typed even when min is 30.
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)));
  const commit = () => {
    const n = parseInt(draft, 10);
    if (Number.isNaN(n)) setDraft(String(value));
    else set(n);
  };

  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" className="stepper-btn" aria-label={t('common.decrease', { label })} onClick={() => set(value - step)} disabled={value <= min}>
        −
      </button>
      <div className="stepper-value">
        <input
          type="number"
          inputMode="numeric"
          aria-label={label}
          value={draft}
          min={min}
          max={max}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        {suffix && <span className="stepper-suffix">{suffix}</span>}
      </div>
      <button type="button" className="stepper-btn" aria-label={t('common.increase', { label })} onClick={() => set(value + step)} disabled={value >= max}>
        +
      </button>
    </div>
  );
}
