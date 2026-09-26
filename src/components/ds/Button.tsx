import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactElement } from 'react';
import { Icon } from './Icon';
import type { IconName } from './types';
import { cx } from './internal/cx';
import './Button.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `primary` (ink) is used once per view for the thing the screen is for. */
  variant?: 'primary' | 'secondary' | 'support' | 'lemon' | 'ghost';
  /** `lg` is the main lesson action and the home call to action. */
  size?: 'md' | 'lg';
  icon?: IconName;
  iconRight?: IconName;
  block?: boolean;
  /** Renders an `<a>` instead of a `<button>`. */
  href?: string;
}

/**
 * The one button, in four variants. Label is a verb phrase in sentence case
 * ("Continue to Write", "Read instead"). A disabled button should always have
 * a helper line nearby saying what unlocks it (see `ActionBar`).
 */
export function Button({
  variant = 'primary',
  size,
  icon,
  iconRight,
  block,
  href,
  className,
  children,
  type = 'button',
  disabled,
  ...rest
}: ButtonProps): ReactElement {
  const cls = cx('tw-btn', `tw-btn-${variant}`, size === 'lg' && 'tw-btn-lg', block && 'tw-btn-block', className);
  const iconSize = size === 'lg' ? 22 : 20;
  const content = (
    <>
      {icon ? <Icon name={icon} size={iconSize} /> : null}
      <span>{children}</span>
      {iconRight ? <Icon name={iconRight} size={iconSize} /> : null}
    </>
  );

  if (href) {
    // An anchor has no `disabled`; a disabled-looking link should not be given an href by the caller.
    const anchorRest = rest as unknown as AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a href={href} className={cls} {...anchorRest}>
        {content}
      </a>
    );
  }

  return (
    <button type={type} className={cls} disabled={disabled} {...rest}>
      {content}
    </button>
  );
}
