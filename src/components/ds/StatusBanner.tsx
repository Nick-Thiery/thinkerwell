import type { ReactNode } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';
import { cx } from './internal/cx';
import type { IconName } from './types';
import './StatusBanner.css';

export interface StatusBannerProps {
  tone?: 'offline' | 'back' | 'info';
  /** Typed `string` in the reference's index.d.ts, but it feeds straight into `<Icon name>`; kept as IconName here for type safety. */
  icon?: IconName;
  title?: string;
  action?: string;
  /** Called when `action` is pressed. The button only renders when both are given. */
  onAction?: () => void;
  children?: ReactNode;
  className?: string;
}

/**
 * A one-line connection message under the site header
 * (docs/design-system/components/StatusBanner.md). Never blocks the page.
 */
export function StatusBanner({ tone = 'offline', icon, title, action, onAction, children, className }: StatusBannerProps) {
  const resolvedIcon: IconName = icon ?? (tone === 'offline' ? 'WifiOff' : tone === 'back' ? 'Wifi' : 'Info');
  return (
    <div className={cx('tw-status', `tw-status-${tone}`, className)} role="status">
      <Icon name={resolvedIcon} size={20} />
      <span className="tw-status-text">
        {title ? <strong>{title} </strong> : null}
        {children}
      </span>
      {action && onAction && tone !== 'offline' ? (
        <Button variant="ghost" onClick={onAction}>
          {action}
        </Button>
      ) : null}
    </div>
  );
}
