import type { CSSProperties } from 'react';
import { useI18n } from '../../i18n';
import { Icon } from './Icon';
import { cx } from './internal/cx';
import { ProgressRing } from './ProgressRing';
import type { IconName, SectionId } from './types';
import './SectionHeader.css';

const SECTION_ICONS: Record<SectionId, IconName> = {
  history: 'Landmark',
  geography: 'Map',
  culture: 'Palette',
  civics: 'Scale',
};

export interface SectionHeaderProps {
  section: SectionId;
  number: number;
  title?: string;
  question?: string;
  completed?: number;
  total?: number;
  rounded?: boolean;
  className?: string;
}

/**
 * The tinted band that opens a section on the course page, with its guiding
 * question and a progress ring (docs/design-system/components/SectionHeader.md).
 * Sits on top of a white card that holds the section's LessonRows.
 */
export function SectionHeader({
  section,
  number,
  title,
  question,
  completed,
  total,
  rounded,
  className,
}: SectionHeaderProps) {
  const { t } = useI18n();
  const icon = SECTION_ICONS[section] ?? SECTION_ICONS.history;
  const style: CSSProperties | undefined = rounded ? { borderRadius: 'var(--radius-xl)' } : undefined;
  const eyebrow = total
    ? t('ds.course.sectionHeader.eyebrowWithTotal', { number: number || 1, count: total })
    : t('ds.course.sectionHeader.eyebrow', { number: number || 1 });
  return (
    <div className={cx('tw-sechead', `tw-sec-${section || 'history'}`, className)} style={style}>
      <span className="tw-secdisc">
        <Icon name={icon} size={30} />
      </span>
      <div className="tw-sechead-text">
        <span className="tw-secbadge-eyebrow" style={{ color: 'var(--ink)' }}>
          {eyebrow}
        </span>
        <h2 className="tw-sechead-title">{title || t(`ds.course.sectionName.${section}`)}</h2>
        {question ? (
          <p className="tw-sechead-q" style={{ color: 'var(--ink)' }}>
            {question}
          </p>
        ) : null}
      </div>
      {total ? <ProgressRing value={completed || 0} max={total} size={64} /> : null}
    </div>
  );
}
