import type { ButtonHTMLAttributes, ReactElement } from 'react';
import { Icon } from './Icon';
import type { IconName } from './types';
import { cx } from './internal/cx';
import './ToolToggle.css';

export interface ToolToggleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: IconName;
  /** Omit for a plain action; pass true/false for a tool that stays on or off (Listen, Key words). */
  pressed?: boolean;
  /** "support" (lavender) for helper tools. */
  tone?: 'support';
}

/**
 * A pill toggle for reading tools such as Listen. The label stays the same;
 * state comes from `aria-pressed`, which fills the pill with ink when true.
 */
export function ToolToggle({
  icon,
  pressed,
  tone,
  className,
  children,
  type = 'button',
  ...rest
}: ToolToggleProps): ReactElement {
  return (
    <button
      type={type}
      className={cx('tw-tool', tone === 'support' && 'tw-tool-support', className)}
      aria-pressed={pressed === undefined ? undefined : pressed}
      {...rest}
    >
      {icon ? <Icon name={icon} /> : null}
      <span>{children}</span>
    </button>
  );
}
