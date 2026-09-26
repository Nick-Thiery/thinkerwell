import './ProgressBar.css';

export interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  valueLabel?: string;
}

/**
 * A thin bar with an optional label row, for parts of a reading or questions
 * in a quiz. Pair with words ("Question 3 of 10"): `label` and `valueLabel`
 * are always caller-supplied, so this component has no default text.
 */
export function ProgressBar({ value, max, label, valueLabel }: ProgressBarProps) {
  const fraction = max ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div className="tw-bar">
      {label || valueLabel ? (
        <div className="tw-bar-label">
          <span>{label}</span>
          <span>{valueLabel}</span>
        </div>
      ) : null}
      <div
        className="tw-bar-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
      >
        <div className="tw-bar-fill" style={{ width: `${fraction * 100}%` }} />
      </div>
    </div>
  );
}
