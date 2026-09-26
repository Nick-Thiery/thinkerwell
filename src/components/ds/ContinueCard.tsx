import { useI18n } from '../../i18n';
import { Button } from './Button';
import { cx } from './internal/cx';
import { StageDots } from './StageDots';
import type { StageId } from './types';
import './ContinueCard.css';

export interface ContinueCardProps {
  title: string;
  eyebrow?: string;
  lessonLabel?: string;
  done?: StageId[];
  current?: StageId;
  stageLabel?: string;
  cta?: string;
  href?: string;
  className?: string;
}

/**
 * The big lemon card at the top of the dashboard that takes the learner back
 * to their next step (docs/design-system/components/ContinueCard.md). One per
 * dashboard, always first.
 */
export function ContinueCard({
  title,
  eyebrow,
  lessonLabel,
  done,
  current,
  stageLabel,
  cta,
  href,
  className,
}: ContinueCardProps) {
  const { t } = useI18n();
  return (
    <section className={cx('tw-continue', className)} aria-label={t('ds.course.continueCard.label')}>
      <div>
        <span className="tw-continue-eyebrow">{eyebrow || t('ds.course.continueCard.eyebrow')}</span>
        <h2 className="tw-continue-title">{title}</h2>
        <div className="tw-continue-meta">
          {lessonLabel ? <span>{lessonLabel}</span> : null}
          <StageDots done={done || []} current={current} />
          {stageLabel ? <span>{stageLabel}</span> : null}
        </div>
      </div>
      <Button variant="primary" size="lg" iconRight="ArrowRight" href={href || '#'}>
        {cta || t('ds.course.continueCard.cta')}
      </Button>
    </section>
  );
}
