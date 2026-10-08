interface Props {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange(v: boolean): void;
}

export function Toggle({ label, checked, disabled, onChange }: Props) {
  return (
    <label className={`row toggle ${disabled ? 'toggle-disabled' : ''}`}>
      <span>{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle-track" aria-hidden="true" />
    </label>
  );
}
