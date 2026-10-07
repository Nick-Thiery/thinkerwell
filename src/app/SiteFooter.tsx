import { Link, useLocation } from 'react-router';
import { useI18n } from '../i18n';
import { THINKERWELL_LINKEDIN } from '../seo/site';
import { creditsPath, organisationsPath } from './lessonUrls';
import './SiteFooter.css';

/**
 * The foot of every page: For organisations, for the adults deciding on a
 * pilot (the header already links For educators and About), Credits, and
 * Thinkerwell's LinkedIn Page (src/seo/site.ts), which opens in a new tab.
 * A plain link: no LinkedIn script, feed or button. Never printed.
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
          <li>
            <a href={THINKERWELL_LINKEDIN} target="_blank" rel="noreferrer">
              {t('footer.linkedin')}
              <span className="tw-visually-hidden"> {t('pages.teacherTools.newTab')}</span>
            </a>
          </li>
        </ul>
      </nav>
    </footer>
  );
}
