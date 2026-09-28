import { createElement } from 'react';
import { useI18n } from '../../i18n';
import { useDsLinkComponent } from './DsLinkProvider';
import { Icon } from './Icon';
import { cx } from './internal/cx';
import type { IconName, StageId } from './types';
import './StagePath.css';

export interface StagePathProps {
  current?: StageId;
  done?: StageId[];
  orientation?: 'horizontal' | 'vertical';
  /** Vertical only, e.g. `{ read: '3 parts · quick check' }`. */
  sublabels?: Partial<Record<StageId, string>>;
  /** Icons only except the current step, for phones. */
  compact?: boolean;
  /** Renders each step as a link to its stage's URL. Any stage is openable in any order (CLAUDE.md rule 3). */
  hrefFor?: (stage: StageId) => string;
  /** Fires when a step is activated, in addition to (or instead of) `hrefFor`. */
  onSelect?: (stage: StageId) => void;
}

const STAGE_ORDER: StageId[] = ['read', 'write', 'speak', 'watch', 'reflect'];

const STAGE_ICON: Record<StageId, IconName> = {
  read: 'BookOpen',
  write: 'Pencil',
  speak: 'MessageCircle',
  watch: 'Play',
  reflect: 'RefreshCw',
};

/**
 * The Read, Write, Speak, Watch, Reflect path inside a lesson. Every step
 * stays clickable: no stage is ever locked (CLAUDE.md rule 3).
 */
export function StagePath({
  current,
  done = [],
  orientation = 'horizontal',
  sublabels,
  compact,
  hrefFor,
  onSelect,
}: StagePathProps) {
  const { t } = useI18n();
  const LinkTag = useDsLinkComponent();
  return (
    <nav aria-label={t('ds.chrome.stagePath.navLabel')}>
      <ol
        className={cx(
          'tw-stages',
          orientation === 'vertical' && 'tw-stages-vertical',
          compact && 'tw-stages-compact',
        )}
      >
        {STAGE_ORDER.map((id) => {
          const label = t(`stages.${id}`);
          const isDone = done.includes(id);
          const isNow = id === current;
          const mark =
            isDone && !isNow ? <Icon name="Check" size={18} strokeWidth={3} /> : <Icon name={STAGE_ICON[id]} size={18} />;
          const sub = sublabels?.[id];
          const labelEl =
            orientation === 'vertical' ? (
              <span className="tw-step-text">
                <span className="tw-step-label">{label}</span>
                {sub ? <span className="tw-step-sub">{sub}</span> : null}
              </span>
            ) : (
              <span className="tw-step-label">{label}</span>
            );
          const href = hrefFor?.(id);
          const stepProps = {
            className: 'tw-step',
            'aria-current': isNow ? ('step' as const) : undefined,
            'aria-label': compact ? (isDone ? t('ds.chrome.stagePath.stageDone', { stage: label }) : label) : undefined,
          };
          const content = (
            <>
              <span className="tw-step-mark">{mark}</span>
              {labelEl}
              {isDone && !isNow ? <span className="tw-sr">{t('ds.chrome.stagePath.doneSuffix')}</span> : null}
            </>
          );
          return (
            <li key={id} className={cx(isDone && 'tw-done')}>
              {href
                ? // createElement, not JSX: see the matching comment in Button.tsx.
                  createElement(LinkTag, { ...stepProps, href, onClick: onSelect ? () => onSelect(id) : undefined }, content)
                : (
                    <button {...stepProps} type="button" onClick={onSelect ? () => onSelect(id) : undefined}>
                      {content}
                    </button>
                  )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
