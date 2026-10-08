import type { CSSProperties, ReactNode } from 'react';
import { useI18n } from '../../i18n';
import { Icon } from './Icon';
import { cx } from './internal/cx';
import type { IconName, SectionId } from './types';
import './SectionBadge.css';

/**
 * Each section's icon. The full names have a default (README's four section
 * names) that lives in i18n as `ds.course.sectionName.<id>`; a caller
 * building a real page passes the actual title from content/course.json
 * through `name` instead.
 */
const SECTION_ICONS: Record<SectionId, IconName> = {
  history: 'Landmark',
  geography: 'Map',
  culture: 'Palette',
  civics: 'Scale',
};

export interface SectionBadgeProps {
  /** The section's tint (and its icon, unless `icon` says otherwise). */
  section: SectionId;
  /** Not in the reference: another course's section icon, beside the tint it borrows (src/content/courses.ts). */
  icon?: IconName;
  number?: number;
  /** The section's name: course text marked with <En>, or a message holding it. The interface's own name when left out. */
  name?: ReactNode;
  showName?: boolean;
  size?: number;
  /** Not in the reference's index.d.ts, but bundle.js applies it (cx(..., props.className)); kept for callers that need to extend layout. */
  className?: string;
  style?: CSSProperties;
}

/** A section's tinted disc and icon, with its number and name (docs/design-system/components/SectionBadge.md). */
export function SectionBadge({ section, icon: iconName, number, name, showName = true, size, className, style }: SectionBadgeProps) {
  const { t } = useI18n();
  const icon = iconName ?? SECTION_ICONS[section] ?? SECTION_ICONS.history;
  const discStyle: CSSProperties | undefined = size ? { width: size, height: size } : undefined;
  return (
    <span className={cx('tw-secbadge', className)} style={style}>
      <span className={cx('tw-secdisc', `tw-sec-${section || 'history'}`)} style={discStyle}>
        <Icon name={icon} size={size ? Math.round(size * 0.5) : 24} />
      </span>
      {showName !== false && (
        <span className="tw-secbadge-text">
          {number ? (
            <span className="tw-secbadge-eyebrow">{t('ds.course.sectionBadge.eyebrow', { number })}</span>
          ) : null}
          <span className="tw-secbadge-name">{name || t(`ds.course.sectionName.${section}`)}</span>
        </span>
      )}
    </span>
  );
}
