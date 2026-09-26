import type { ReactNode } from 'react';
import { useI18n } from '../../i18n';
import { Icon } from './Icon';
import { Logo } from './Logo';
import { cx } from './internal/cx';
import type { IconName } from './types';
import './SiteHeader.css';

export interface SiteHeaderProps {
  logoSrc: string;
  /** In order: Home, Course, My journal, For educators, About. */
  links?: Array<{ label: string; href?: string; icon?: IconName; active?: boolean }>;
  /** null (the default) shows no learner chip. */
  learner?: { name: string; tone?: string } | null;
  /** Phone layout: logo, learner avatar and a menu button. */
  compact?: boolean;
  /** Extra controls at the end, in the full (non-compact) layout. */
  children?: ReactNode;
  /**
   * Not in the design-system docs (index.d.ts); added so a caller can open
   * the learner switcher. Storage is wired in phase 3 — this component only
   * makes the chip a real, labelled, focusable button.
   */
  onLearnerClick?: () => void;
  /** Not in the design-system docs; opens the phone navigation menu. */
  onMenuClick?: () => void;
}

/** A small tinted initial, shared with LearnerTile's own copy (kept separate; see CLAUDE.md notes). */
function Avatar({ name, tone }: { name: string; tone?: string }) {
  return (
    <span className={cx('tw-avatar', `tw-tone-${tone || 'lavender'}`)} aria-hidden="true">
      {(name || '?').charAt(0).toUpperCase()}
    </span>
  );
}

/**
 * The yellow site header, with the logo, five links and the current
 * learner. Compact on phones.
 *
 * `compact` is the caller's own decision (there's no internal breakpoint):
 * the full layout's nav links and learner chip never shrink or wrap, so
 * below about 1100px wide (tablets, and some laptops) the caller should
 * pass `compact`, matching the tablet screens in docs/screens.
 */
export function SiteHeader({
  logoSrc,
  links = [],
  learner = null,
  compact = false,
  children,
  onLearnerClick,
  onMenuClick,
}: SiteHeaderProps) {
  const { t } = useI18n();
  return (
    <header className={cx('tw-header', compact && 'tw-header-compact')}>
      <div className="tw-header-inner">
        <Logo src={logoSrc} size={compact ? 40 : 46} />
        {compact ? (
          <div className="tw-header-right">
            {learner ? (
              <button
                type="button"
                className="tw-learner-chip"
                aria-label={t('ds.chrome.siteHeader.switchLearner', { name: learner.name })}
                onClick={onLearnerClick}
              >
                <Avatar name={learner.name} tone={learner.tone} />
              </button>
            ) : null}
            <button
              type="button"
              className="tw-menu-btn"
              aria-label={t('ds.chrome.siteHeader.openMenu')}
              onClick={onMenuClick}
            >
              <Icon name="Menu" size={26} />
            </button>
          </div>
        ) : (
          <div className="tw-header-right">
            <nav className="tw-nav" aria-label={t('nav.label')}>
              {links.map((link, i) => (
                <a key={i} href={link.href || '#'} aria-current={link.active ? 'page' : undefined}>
                  {link.icon ? <Icon name={link.icon} size={18} /> : null}
                  {link.label}
                </a>
              ))}
            </nav>
            {learner ? (
              <button type="button" className="tw-learner-chip" onClick={onLearnerClick}>
                <Avatar name={learner.name} tone={learner.tone} />
                <span>{learner.name}</span>
                <Icon name="ChevronDown" size={18} />
              </button>
            ) : null}
            {children}
          </div>
        )}
      </div>
    </header>
  );
}
