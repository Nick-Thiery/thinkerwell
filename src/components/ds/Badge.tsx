import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { cx } from './internal/cx';
import type { IconName, SectionId } from './types';
import './Badge.css';

export interface BadgeProps {
  tone?: 'lemon' | 'lavender' | 'outline' | 'correct' | 'retry' | 'ink' | SectionId;
  icon?: IconName;
  children?: ReactNode;
}

/** One or two words of status or category. */
export function Badge({ tone, icon, children }: BadgeProps) {
  return (
    <span className={cx('tw-badge', tone && `tw-badge-${tone}`)}>
      {icon ? <Icon name={icon} size={16} /> : null}
      {children}
    </span>
  );
}
