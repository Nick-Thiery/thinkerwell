import type { ReactNode } from 'react';
import { useI18n } from '../../i18n';
import { Icon } from './Icon';
import { cx } from './internal/cx';
import type { IconName } from './types';
import './TaskCard.css';

export interface TaskCardProps {
  eyebrow?: string;
  icon?: IconName;
  /** Large yellow areas use a paler wash so the card still reads as "your task" (docs/design-system/README.md). */
  tone?: 'lavender';
  children: ReactNode;
  className?: string;
}

/** "Your task" card: the yellow prompt above a reading or a stage. */
export function TaskCard({ eyebrow, icon = 'Target', tone, children, className }: TaskCardProps) {
  const { t } = useI18n();
  return (
    <section
      className={cx('tw-task', className)}
      style={tone === 'lavender' ? { background: 'var(--lavender-wash)' } : undefined}
    >
      <span className="tw-task-eyebrow">
        <Icon name={icon} size={18} />
        {eyebrow || t('ds.content.task.defaultEyebrow')}
      </span>
      <div className="tw-task-body">{children}</div>
    </section>
  );
}
