import { useEffect, useMemo, useRef } from 'react';
import { NavigationType, NavLink, Outlet, ScrollRestoration, useLocation, useNavigationType } from 'react-router';
import { I18nProvider, readDevDirection, useI18n } from '../i18n';
import './app.css';

/**
 * The shell around every page: locale and direction, a skip link, a minimal
 * header (replaced by SiteHeader in phase 2 and 3) and <main>.
 */
export function AppLayout() {
  const { search } = useLocation();
  // Dev only: ?dir=rtl forces right-to-left until ?dir=ltr (see src/i18n/direction.ts).
  const devDir = useMemo(() => readDevDirection(search), [search]);

  return (
    <I18nProvider dirOverride={devDir}>
      <Shell devRtl={devDir === 'rtl'} />
    </I18nProvider>
  );
}

function Shell({ devRtl }: { devRtl: boolean }) {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const mainRef = useRef<HTMLElement>(null);
  const lastPathname = useRef(pathname);
  // Set when a link or back navigation lands on a redirect (no h1 yet), so the
  // page the redirect leads to still gets focus. Lasts one hop only.
  const focusPending = useRef(false);

  // After the learner moves to another page (link or back button), move focus
  // to the new page's heading so screen-reader and keyboard users start at the
  // top. Not on first load, and not after a redirect (a REPLACE navigation)
  // unless that redirect followed a link, e.g. a link to /lesson/l6.
  useEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    const isReplace = navigationType === NavigationType.Replace;
    if (!isReplace) focusPending.current = true;
    if (!focusPending.current) return;
    const heading = mainRef.current?.querySelector<HTMLElement>('h1');
    if (heading) heading.focus({ preventScroll: true });
    // Keep waiting only if this was the link itself and it rendered no heading.
    focusPending.current = !heading && !isReplace;
  }, [pathname, navigationType]);

  const links = [
    { to: '/', label: t('nav.home'), end: true },
    { to: '/course', label: t('nav.course') },
    { to: '/journal', label: t('nav.journal') },
    { to: '/educators', label: t('nav.educators') },
    { to: '/about', label: t('nav.about') },
  ];

  return (
    <>
      <a className="tw-skip-link" href="#main">
        {t('app.skipToContent')}
      </a>
      {import.meta.env.DEV && devRtl ? (
        <p className="tw-dev-banner small" role="status">
          {t('dev.rtlOn')}
        </p>
      ) : null}
      <header className="tw-shell-header">
        <nav aria-label={t('nav.label')}>
          <ul role="list" className="tw-shell-nav">
            {links.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} end={link.end ?? false}>
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="main" ref={mainRef} tabIndex={-1} className="tw-shell-main">
        <Outlet />
      </main>
      <ScrollRestoration />
    </>
  );
}
