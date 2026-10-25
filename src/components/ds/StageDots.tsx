import { useI18n } from '../../i18n';
import { cx } from './internal/cx';
import type { StageId } from './types';
import './StageDots.css';

export interface StageDotsProps {
  done?: StageId[];
  current?: StageId;
  /** The lesson's steps: all five unless it has none of one (StagePath's `stages`). */
  stages?: readonly StageId[];
}

const STAGE_ORDER: readonly StageId[] = ['read', 'write', 'speak', 'watch', 'reflect'];

/**
 * One small dot per step (five, or four without Watch) showing a lesson's stage progress. Always pair with text
 * that says the same thing ("Next: Write") or put it inside a row that has
 * its own accessible label.
 */
export function StageDots({ done = [], current, stages = STAGE_ORDER }: StageDotsProps) {
  const { t } = useI18n();
  return (
    <ol
      className="tw-dots"
      aria-label={t('ds.chrome.stageDots.progressLabel', { count: done.filter((id) => stages.includes(id)).length, total: stages.length })}
    >
      {stages.map((id) => {
        const isDone = done.includes(id);
        const isNow = id === current;
        return <li key={id} className={cx(isDone && 'tw-done', isNow && 'tw-now')} title={t(`stages.${id}`)} />;
      })}
    </ol>
  );
}
