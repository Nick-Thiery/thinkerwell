import { Link, useLocation } from 'react-router';
import { useI18n } from '../i18n';
import { creditsPath, organisationsPath } from './lessonUrls';
import './SiteFooter.css';

/**
 * The foot of every page: For organisations, for the adults deciding on a
 * pilot (the header already links For educators and About), and Credits.
 * Never printed.
 */
export function SiteFooter() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const links = [
    { href: organisationsPath(), label: t('footer.organisations') },
    { href: creditsPath(), label: t('footer.credits') },
  ];
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
    </footer>
  );
}
