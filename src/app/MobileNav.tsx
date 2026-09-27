import { useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { useDsLinkComponent, Icon } from '../components/ds';
import { useI18n } from '../i18n';
import { trapTabKey } from './internal/focusTrap';
import './MobileNav.css';

export interface MobileNavLink {
  label: string;
  href: string;
  active?: boolean;
}

export interface MobileNavProps {
  links: MobileNavLink[];
  /** Settings for this device, under the five main links (outside the Main navigation). */
  settingsLink?: MobileNavLink;
  onClose: () => void;
}

/** The phone navigation sheet SiteHeader's compact menu button opens. */
export function MobileNav({ links, settingsLink, onClose }: MobileNavProps) {
  const { t } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(document.activeElement);
  const LinkTag = useDsLinkComponent();

  const close = useCallback(() => {
    onClose();
    if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus();
  }, [onClose]);

  useEffect(() => {
    rootRef.current?.querySelector<HTMLElement>('a, button')?.focus();
  }, []);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && event.target instanceof Node && !rootRef.current.contains(event.target)) close();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (rootRef.current) trapTabKey(event, rootRef.current);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [close]);

  return (
    <div className="tw-mobilenav-overlay">
      <div className="tw-mobilenav" role="dialog" aria-modal="true" aria-label={t('header.menuTitle')} ref={rootRef}>
        <div className="tw-mobilenav-head">
          <span>{t('header.menuTitle')}</span>
          <button type="button" className="tw-menu-btn" aria-label={t('header.menuClose')} onClick={close}>
            <Icon name="X" size={18} />
          </button>
        </div>
        <nav aria-label={t('nav.label')}>
          <ul role="list" className="tw-mobilenav-list">
            {links.map((link) => (
              <li key={link.href}>
                <LinkTag href={link.href} aria-current={link.active ? 'page' : undefined} onClick={close}>
                  {link.label}
                </LinkTag>
              </li>
            ))}
          </ul>
        </nav>
        {settingsLink ? (
          <div className="tw-mobilenav-device">
            <Link to={settingsLink.href} aria-current={settingsLink.active ? 'page' : undefined} onClick={close}>
              <Icon name="Settings" size={20} />
              {settingsLink.label}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
