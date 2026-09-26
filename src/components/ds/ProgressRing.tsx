import { useI18n } from '../../i18n';
import './ProgressRing.css';

export interface ProgressRingProps {
  value: number;
  max: number;
  /** Pixel size. Default 56. */
  size?: number;
  /** Defaults to "value/max"; null hides it. */
  label?: string | null;
  ariaLabel?: string;
}

/** A ring with a short count in the middle, for section and course progress. Never for time. */
export function ProgressRing({ value, max, size = 56, label, ariaLabel }: ProgressRingProps) {
  const { t } = useI18n();
  const stroke = Math.max(4, Math.round(size / 10));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = max ? Math.max(0, Math.min(1, value / max)) : 0;
  const shownLabel = label !== undefined ? label : t('ds.chrome.progressRing.valueLabel', { value, max });
  return (
    <span
      className="tw-ring"
      role="img"
      aria-label={ariaLabel || t('ds.chrome.progressRing.ariaLabel', { value, max })}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="tw-ring-track" cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} />
        {fraction > 0 ? (
          <circle
            className="tw-ring-fill"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - fraction)}
          />
        ) : null}
      </svg>
      {shownLabel === null ? null : (
        <span className="tw-ring-label" style={{ fontSize: Math.max(14, Math.round(size * 0.26)) }}>
          {shownLabel}
        </span>
      )}
    </span>
  );
}
