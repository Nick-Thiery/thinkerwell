import type { ReactNode } from 'react';
import { useI18n } from '../../i18n';
import { Icon } from './Icon';
import { cx } from './internal/cx';
import './Feedback.css';

export interface FeedbackProps {
  tone?: 'correct' | 'retry';
  title?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/**
 * The response after a check answer. "Not quite" always comes with the word
 * and the burnt-orange icon, never colour alone (CLAUDE.md: no red, ever).
 */
export function Feedback({ tone = 'correct', title, action, children, className }: FeedbackProps) {
  const { t } = useI18n();
  const defaultTitle = tone === 'correct' ? t('ds.content.feedback.correctTitle') : t('ds.content.feedback.retryTitle');
  return (
    <div className={cx('tw-feedback', `tw-feedback-${tone}`, className)} role="status">
      <span className="tw-feedback-icon">
        <Icon name={tone === 'correct' ? 'Check' : 'RotateCcw'} size={18} strokeWidth={3} />
      </span>
      <div>
        <span className="tw-feedback-title">{title || defaultTitle}</span>
        <span>{children}</span>
        {action ? <div className="tw-feedback-action">{action}</div> : null}
      </div>
    </div>
  );
}
