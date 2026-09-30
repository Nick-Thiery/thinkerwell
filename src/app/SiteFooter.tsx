import { Link, useLocation } from 'react-router';
import { useI18n } from '../i18n';
import { organisationsPath } from './lessonUrls';
import './SiteFooter.css';

/**
 * The foot of every page: For organisations, for the adults deciding on a
 * pilot (the header already links For educators and About), and the honest
 * line that Thinkerwell is a student-led project, not a registered charity
 * (CLAUDE.md rule 8). Never printed.
 */
export function SiteFooter() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const links = [{ href: organisationsPath(), label: t('footer.organisations') }];
  return (
    <footer className="tw-site-footer">
      <nav aria-label={t('footer.label')}>
        <ul role="list">
          {links.map((link) => (
            <li key={link.href}>
              <Link to={link.href} aria-current={pathname === link.href ? 'page' : undefined}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <p className="small">{t('footer.honesty')}</p>
    </footer>
  );
}
