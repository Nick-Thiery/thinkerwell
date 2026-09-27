import type { ReactElement } from 'react';
import { Icon } from './Icon';
import type { IconName } from './types';
import { cx } from './internal/cx';
import './SegmentedControl.css';

export type SegmentedControlOption = string | { label: string; value: string; icon?: IconName };

export interface SegmentedControlProps {
  /** Two to four mutually exclusive options, e.g. Standard | Simpler. */
  options: SegmentedControlOption[];
  value?: string;
  onChange?: (value: string) => void;
  /** Accessible name for the group (this control has no visible label of its own). */
  label?: string;
  /** Not in the design-system docs: every option unavailable (Settings, when this browser window can't save). */
  disabled?: boolean;
  /** Not in the design-system docs: the id of a line that explains the choice (aria-describedby). */
  describedBy?: string;
  className?: string;
}

/**
 * One pill holding two to four mutually exclusive options, such as
 * Standard | Simpler English or Write | Starters | Plan. Not for navigation
 * between pages.
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  label,
  disabled,
  describedBy,
  className,
}: SegmentedControlProps): ReactElement {
  return (
    <div className={cx('tw-seg', className)} role="group" aria-label={label} aria-describedby={describedBy}>
      {options.map((option) => {
        const opt = typeof option === 'string' ? { label: option, value: option } : option;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={opt.value === value}
            disabled={disabled}
            onClick={() => onChange?.(opt.value)}
          >
            {opt.icon ? <Icon name={opt.icon} size={18} /> : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
