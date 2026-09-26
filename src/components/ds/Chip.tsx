import { useRef, type ButtonHTMLAttributes, type KeyboardEvent, type ReactElement } from 'react';
import { Icon } from './Icon';
import type { IconName } from './types';
import { cx } from './internal/cx';
import { handleRovingKeyDown, useRovingTabIndex } from './internal/rovingFocus';
import './Chip.css';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  /** Inside a `role="radiogroup"`, for one-of-many choices (a map site, how you practised). */
  role?: 'radio';
  /** Dashed sentence starter that inserts text into a writing box. */
  variant?: 'starter';
  icon?: IconName;
}

/**
 * A pill for one-tap choices and dashed sentence starters. Selected chips
 * fill with ink. A `role="radio"` chip takes the same left/right (and
 * Home/End) roving as `ChoiceOption` when it sits inside a `radiogroup`.
 */
export function Chip({
  selected,
  role,
  variant,
  icon,
  className,
  children,
  type = 'button',
  onKeyDown,
  ...rest
}: ChipProps): ReactElement {
  const isRadio = role === 'radio';
  const buttonRef = useRef<HTMLButtonElement>(null);
  useRovingTabIndex(buttonRef, Boolean(selected));

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (isRadio && handleRovingKeyDown(event)) return;
    onKeyDown?.(event);
  }

  return (
    <button
      ref={buttonRef}
      type={type}
      role={role}
      aria-checked={isRadio ? Boolean(selected) : undefined}
      aria-pressed={!isRadio && selected !== undefined ? selected : undefined}
      className={cx('tw-chip', variant === 'starter' && 'tw-chip-starter', className)}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {icon ? <Icon name={icon} size={18} /> : null}
      <span>{children}</span>
    </button>
  );
}
